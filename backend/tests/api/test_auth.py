import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.deps import get_current_user
from app.main import app
from app.modules.auth.models.user import User
from app.modules.auth.services.user_sync import upsert_user_from_jwt
from tests.conftest import TEST_DATABASE_URL


@pytest.fixture
def mock_user():
    # Clerk user IDs are strings like ``user_2abc123…``, not UUIDs.
    return User(
        id="user_test_authenticated",
        email="test@example.com",
        name="Test User",
    )


@pytest.fixture
async def commit_session():
    """A session that commits (not the db_session fixture, which is wrapped
    in a rollback-only transaction). Used for tests that explicitly verify
    a function commits to the DB.
    """
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


async def test_auth_me_unauthenticated(test_client: AsyncClient):
    # Override get_current_user to simulate unauthenticated
    def override_unauth():
        raise HTTPException(status_code=401, detail="Unauthorized")

    app.dependency_overrides[get_current_user] = override_unauth

    response = await test_client.get("/api/v1/auth/me")
    assert response.status_code == 401

    del app.dependency_overrides[get_current_user]


async def test_auth_me_authenticated(test_client: AsyncClient, mock_user: User):
    # Override get_current_user
    app.dependency_overrides[get_current_user] = lambda: mock_user

    response = await test_client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user_test_authenticated"
    assert data["email"] == "test@example.com"

    # Cleanup override
    del app.dependency_overrides[get_current_user]


async def test_get_current_user_lazy_upserts_on_jwt(commit_session):
    """First-authenticated-request safety net: a JWT whose ``sub`` is not in
    the ``users`` table should create the row from the JWT claims instead of
    returning a dummy unsaved instance.
    """
    new_user_id = "user_lazy_upsert_xyz"
    payload = {
        "sub": new_user_id,
        "email": "lazy@example.com",
        "email_verified": True,
        "given_name": "Lazy",
        "family_name": "Upsert",
    }

    user = await upsert_user_from_jwt(commit_session, payload)

    assert user.id == new_user_id
    assert user.email == "lazy@example.com"
    assert user.email_verified is True
    assert user.name == "Lazy Upsert"


async def test_get_current_user_lazy_upsert_idempotent(commit_session):
    """Calling upsert twice for the same ``sub`` should not duplicate rows."""
    payload = {"sub": "user_idempotent", "email": "idem@example.com", "email_verified": False}

    await upsert_user_from_jwt(commit_session, payload)
    await upsert_user_from_jwt(commit_session, payload)

    # Query via a fresh session (the commit_session one is closing) to confirm
    # the row is visible to other sessions.
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as verify_session:
        result = await verify_session.execute(
            select(User).where(User.id == "user_idempotent")
        )
        users = result.scalars().all()
    await engine.dispose()

    assert len(users) == 1
