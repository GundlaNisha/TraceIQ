"""Tests for the Clerk webhook handler.

The webhook verifies ``svix``-style signatures. To sign test payloads we use
``svix.Webhook.sign`` against the same secret the route reads from settings,
then assemble the three required Svix headers manually.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.modules.auth.models.user import User
from tests.conftest import TEST_DATABASE_URL


@pytest.fixture
async def commit_session():
    """A session that commits (the default ``db_session`` fixture is wrapped
    in a rollback-only transaction, which would conflict with the webhook
    handler's ``await db.commit()`` calls).
    """
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
    await engine.dispose()


async def _refresh_user(user_id: str) -> User | None:
    """Open a fresh session so we see committed state, not a savepoint view."""
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as verify_session:
        result = await verify_session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
    await engine.dispose()
    return user

SECRET = "whsec_dGVzdF9zdXBlcl9zZWNyZXRfc3RyaW5nX2Zvcl91bml0X3Rlc3RzX29ubHk="


@pytest.fixture(autouse=True)
def configure_webhook_secret(monkeypatch):
    monkeypatch.setattr(settings, "clerk_webhook_secret", SECRET)


def _sign_payload(body: bytes, msg_id: str = "msg_test_123") -> dict[str, str]:
    """Return the three Svix headers needed to authenticate the body."""
    from svix.webhooks import Webhook

    signature = Webhook(SECRET).sign(
        msg_id, datetime.now(UTC), body.decode("utf-8")
    )
    return {
        "svix-id": msg_id,
        "svix-timestamp": str(int(datetime.now(UTC).timestamp())),
        "svix-signature": signature,
    }


def _post_event(client: AsyncClient, event_type: str, data: dict):
    body = json.dumps({"type": event_type, "data": data}).encode()
    headers = _sign_payload(body)
    return client.post(
        "/api/v1/webhooks/clerk",
        content=body,
        headers={**headers, "Content-Type": "application/json"},
    )


async def test_webhook_user_created_inserts_row(test_client: AsyncClient, commit_session):
    user_id = "user_clerk_created_1"
    response = await _post_event(
        test_client,
        "user.created",
        {
            "id": user_id,
            "first_name": "Ada",
            "last_name": "Lovelace",
            "username": "ada",
            "image_url": "https://example.com/ada.png",
            "email_addresses": [
                {
                    "id": "idn_email_1",
                    "email_address": "ada@example.com",
                    "verification": {"status": "verified"},
                }
            ],
        },
    )

    assert response.status_code == 200
    assert response.json() == {"received": True, "type": "user.created"}

    user = await _refresh_user(user_id)
    assert user is not None
    assert user.email == "ada@example.com"
    assert user.emailVerified is True
    assert user.name == "ada"
    assert user.image == "https://example.com/ada.png"


async def test_webhook_user_updated_overwrites_fields(test_client: AsyncClient, commit_session):
    user_id = "user_clerk_updated_1"
    commit_session.add(
        User(
            id=user_id,
            name="Old Name",
            email="old@example.com",
            emailVerified=False,
        )
    )
    await commit_session.commit()

    response = await _post_event(
        test_client,
        "user.updated",
        {
            "id": user_id,
            "username": "new_name",
            "email_addresses": [
                {
                    "id": "idn_email_2",
                    "email_address": "new@example.com",
                    "verification": {"status": "verified"},
                }
            ],
        },
    )

    assert response.status_code == 200

    user = await _refresh_user(user_id)
    assert user is not None
    assert user.email == "new@example.com"
    assert user.emailVerified is True
    assert user.name == "new_name"


async def test_webhook_user_deleted_removes_row(test_client: AsyncClient, commit_session):
    user_id = "user_clerk_deleted_1"
    commit_session.add(
        User(
            id=user_id,
            name="Doomed",
            email="doom@example.com",
            emailVerified=True,
        )
    )
    await commit_session.commit()

    response = await _post_event(
        test_client,
        "user.deleted",
        {"id": user_id},
    )

    assert response.status_code == 200

    user = await _refresh_user(user_id)
    assert user is None


async def test_webhook_invalid_signature_returns_401(test_client: AsyncClient, commit_session):
    body = json.dumps({"type": "user.created", "data": {"id": "user_x"}}).encode()
    # Sign with a different secret — the route will reject it.
    from svix.webhooks import Webhook

    bad_secret = "whsec_" + "b3RoZXJfc2VjcmV0X3N0cmluZ19mb3JfdW5pdF90ZXN0c19vbmx5"
    signature = Webhook(bad_secret).sign(
        "msg_test_123", datetime.now(UTC), body.decode("utf-8")
    )
    headers = {
        "svix-id": "msg_test_123",
        "svix-timestamp": str(int(datetime.now(UTC).timestamp())),
        "svix-signature": signature,
    }

    response = await test_client.post(
        "/api/v1/webhooks/clerk",
        content=body,
        headers={**headers, "Content-Type": "application/json"},
    )

    assert response.status_code == 401

    # And nothing was inserted.
    user = await _refresh_user("user_x")
    assert user is None


async def test_webhook_missing_headers_returns_400(test_client: AsyncClient):
    body = json.dumps({"type": "user.created", "data": {"id": "user_y"}}).encode()
    response = await test_client.post(
        "/api/v1/webhooks/clerk",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400


async def test_webhook_unknown_event_type_returns_200(test_client: AsyncClient, commit_session):
    """Clerk retries on non-2xx, so unknown event types must be acknowledged."""
    response = await _post_event(
        test_client,
        "session.created",
        {"id": "sess_abc"},
    )
    assert response.status_code == 200
    assert response.json() == {"received": True, "type": "session.created"}


async def test_webhook_returns_503_when_secret_unset(
    test_client: AsyncClient, monkeypatch
):
    monkeypatch.setattr(settings, "clerk_webhook_secret", "")
    body = json.dumps({"type": "user.created", "data": {"id": "user_z"}}).encode()
    response = await test_client.post(
        "/api/v1/webhooks/clerk",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 503
