import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.engine.url import make_url

from app.core.config import settings
from app.db.base.models import Base
from app.db.session import get_db
from app.main import app


def _derive_test_database_url() -> str:
    """Resolve the database URL tests should connect to.

    Resolution order:
      1. ``TEST_DATABASE_URL`` env var, if set — used as-is.
      2. ``DATABASE_URL`` from settings — used as-is. CI already points this at a
         throwaway DB (``traceiq_test``); appending ``_test`` would yield the
         non-existent ``traceiq_test_test``.
      3. Local dev fallback — append ``_test`` to the database name so the test
         suite never tramples the dev database.
    """
    explicit = os.getenv("TEST_DATABASE_URL")
    if explicit:
        return explicit

    url = make_url(settings.database_url)
    db_name = url.database or ""
    if db_name.endswith("_test") or db_name.endswith("_test_test"):
        # Already a test database (typical CI case) — keep it.
        return url.render_as_string(hide_password=False)

    url = url.set(database=f"{db_name}_test")
    return url.render_as_string(hide_password=False)


TEST_DATABASE_URL = _derive_test_database_url()

test_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
TestingSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

from sqlalchemy import text


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        # Recreate all schema from the current model metadata. The ``users``
        # table (PK on string Clerk IDs) is created by Base.metadata; the old
        # ``neon_auth.user`` table was removed in migration
        # ``51d6d6227432_migrate_to_clerk``.
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

        # Seed the ``users`` table with Clerk-shaped IDs (string PKs, not UUIDs)
        # so tests that bypass ``dependency_overrides[get_current_user]`` and hit
        # the real DB still find rows.
        await conn.execute(
            text(
                "INSERT INTO users (id, name, email, \"emailVerified\", image) "
                "VALUES ('user_test_a', 'Mock A', 'a@example.com', true, NULL),"
                "       ('user_test_b', 'Mock B', 'b@example.com', true, NULL),"
                "       ('user_test_c', 'Mock C', 'test@example.com', true, NULL),"
                "       ('user_test_d', 'Mock D', 'dummy@example.com', true, NULL)"
            )
        )
    yield
    await test_engine.dispose()

@pytest_asyncio.fixture
async def db_session():
    """
    Function-scoped DB session that rolls back after every test to keep them isolated.
    """
    async with test_engine.connect() as conn:
        # Start a nested transaction
        transaction = await conn.begin()
        
        # Bind the session to the connection
        async_session = AsyncSession(
            bind=conn, 
            join_transaction_mode="create_savepoint",
            expire_on_commit=False
        )
        
        yield async_session
        
        await async_session.close()
        # Rollback the transaction to keep the database clean
        await transaction.rollback()

@pytest_asyncio.fixture
async def test_client(db_session):
    """
    Test client that overrides the get_db dependency to use the isolated test session.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
        
    app.dependency_overrides.clear()
