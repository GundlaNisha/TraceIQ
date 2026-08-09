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
        await conn.execute(text("DROP SCHEMA IF EXISTS neon_auth CASCADE;"))
        await conn.execute(text("CREATE SCHEMA neon_auth;"))
        
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
        # Insert mock user IDs used in tests so foreign keys are satisfied
        await conn.execute(text("INSERT INTO neon_auth.user (id, name, email, \"emailVerified\") VALUES ('11111111-1111-1111-1111-111111111111', 'Mock A', 'a@example.com', true);"))
        await conn.execute(text("INSERT INTO neon_auth.user (id, name, email, \"emailVerified\") VALUES ('22222222-2222-2222-2222-222222222222', 'Mock B', 'b@example.com', true);"))
        await conn.execute(text("INSERT INTO neon_auth.user (id, name, email, \"emailVerified\") VALUES ('12345678-1234-5678-1234-567812345678', 'Mock C', 'test@example.com', true);"))
        await conn.execute(text("INSERT INTO neon_auth.user (id, name, email, \"emailVerified\") VALUES ('00000000-0000-0000-0000-000000000000', 'Mock D', 'dummy@example.com', true);"))
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
