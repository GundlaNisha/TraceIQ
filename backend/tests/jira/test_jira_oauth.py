"""Security, concurrency, and lifecycle tests for Jira OAuth 2.0 (3LO) and Dynamic Webhooks."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.core.crypto import decrypt_secret, encrypt_secret
from app.modules.jira.models.jira_integration import JiraIntegration
from app.modules.jira.services.jira_oauth_service import (
    build_jira_webhook_jql,
    create_oauth_authorization_url,
    ensure_valid_oauth_token,
    handle_oauth_callback,
    is_public_https_url,
)
from app.modules.jira.services.jira_service import (
    get_jira_config_response,
    handle_jira_webhook,
)


def test_fernet_encryption_roundtrip_and_legacy_fallback():
    raw = "ATATT3xFfGF0_super_secret_token"
    encrypted = encrypt_secret(raw)
    assert encrypted.startswith("enc:v1:")
    assert raw not in encrypted
    assert decrypt_secret(encrypted) == raw
    # Legacy unencrypted value passes through seamlessly
    assert decrypt_secret("legacy_plain_token") == "legacy_plain_token"
    assert decrypt_secret(None) == ""


def test_public_https_and_jql_sanitization():
    assert is_public_https_url("https://api.traceiq.app") is True
    assert is_public_https_url("https://abc123.ngrok-free.app") is True
    assert is_public_https_url("http://localhost:8000") is False
    assert is_public_https_url("https://localhost:8000") is False
    assert is_public_https_url("http://api.traceiq.app") is False

    assert build_jira_webhook_jql("KAN") == "project = KAN"
    assert build_jira_webhook_jql("PROJ; DROP") == "project = PROJDROP"
    assert build_jira_webhook_jql(None) == "issuetype IS NOT EMPTY"


@pytest.mark.asyncio
async def test_oauth_authorize_generates_state_and_blocks_viewers():
    from app.modules.workspace.models.workspace import WorkspaceRole

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = WorkspaceRole.viewer
    mock_db.execute.return_value = mock_res

    with (
        patch("app.modules.jira.services.jira_oauth_service.is_jira_oauth_enabled", return_value=True),
        pytest.raises(HTTPException) as exc_info,
    ):
        await create_oauth_authorization_url(
            db=mock_db,
            user_id="user_viewer",
            workspace_id=uuid.uuid4(),
            request_base_url="http://localhost:8000",
        )
    assert exc_info.value.status_code == 403

    mock_res.scalar_one_or_none.return_value = WorkspaceRole.owner
    with (
        patch("app.modules.jira.services.jira_oauth_service.is_jira_oauth_enabled", return_value=True),
        patch("app.modules.jira.services.jira_oauth_service.cache.set", new_callable=AsyncMock, return_value=True) as mock_set,
        patch("app.modules.jira.services.jira_oauth_service.settings.jira_oauth_client_id", "client_abc"),
    ):
        url = await create_oauth_authorization_url(
            db=mock_db,
            user_id="user_owner",
            workspace_id=uuid.uuid4(),
            request_base_url="https://api.example.com",
        )
    assert url.startswith("https://auth.atlassian.com/authorize?")
    assert "offline_access" in url
    assert "manage%3Ajira-webhook" in url
    mock_set.assert_awaited_once()


@pytest.mark.asyncio
async def test_oauth_callback_rejects_missing_or_reused_csrf_state():
    mock_db = AsyncMock()
    with (
        patch("app.modules.jira.services.jira_oauth_service.cache.pop", new_callable=AsyncMock, return_value=None),
        pytest.raises(HTTPException) as exc_info,
    ):
        await handle_oauth_callback(db=mock_db, code="auth_code", state="reused_or_invalid_state")
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_oauth_callback_encrypts_tokens_and_registers_https_webhook():
    ws_id = uuid.uuid4()
    state_payload = {
        "user_id": "user_test_a",
        "workspace_id": str(ws_id),
        "redirect_uri": "https://api.example.com/api/v1/jira/oauth/callback",
        "public_base": "https://api.example.com",
        "frontend_origin": "https://app.example.com",
    }

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res

    with (
        patch("app.modules.jira.services.jira_oauth_service.cache.pop", new_callable=AsyncMock, return_value=state_payload),
        patch("app.modules.jira.services.jira_oauth_service.cache.invalidate_workspace", new_callable=AsyncMock),
        patch(
            "app.modules.jira.services.jira_oauth_service._exchange_code_for_tokens",
            new_callable=AsyncMock,
            return_value={
                "access_token": "raw_access_123",
                "refresh_token": "raw_refresh_456",
                "expires_in": 3600,
                "scope": "read:jira-work manage:jira-webhook offline_access",
            },
        ),
        patch(
            "app.modules.jira.services.jira_oauth_service._fetch_accessible_jira_site",
            new_callable=AsyncMock,
            return_value={"id": "cloud-999", "url": "https://acme.atlassian.net", "scopes": ["read:jira-work", "manage:jira-webhook"]},
        ),
        patch("app.integrations.jira.client.JiraClient.test_connection", new_callable=AsyncMock, return_value={"email_address": "pm@acme.com"}),
        patch("app.integrations.jira.client.JiraClient.register_dynamic_webhook", new_callable=AsyncMock, return_value="9001") as mock_reg,
    ):
        redirect_url, integration = await handle_oauth_callback(
            db=mock_db,
            code="valid_code",
            state="valid_state",
        )

    assert redirect_url == "https://app.example.com/requirements?jira_connected=1"
    assert integration.auth_type == "oauth2"
    assert integration.cloud_id == "cloud-999"
    assert integration.oauth_access_token.startswith("enc:v1:")
    assert integration.oauth_refresh_token.startswith("enc:v1:")
    assert integration.webhook_secret.startswith("enc:v1:")
    assert decrypt_secret(integration.oauth_access_token) == "raw_access_123"
    assert decrypt_secret(integration.oauth_refresh_token) == "raw_refresh_456"
    assert integration.jira_webhook_id == "9001"
    assert integration.webhook_status == "active"
    mock_reg.assert_awaited_once()


@pytest.mark.asyncio
async def test_config_response_never_leaks_oauth_secrets():
    integration = JiraIntegration(
        id=uuid.uuid4(),
        user_id="user_test_a",
        auth_type="oauth2",
        cloud_id="cloud-123",
        jira_domain="https://acme.atlassian.net",
        jira_email="pm@acme.com",
        oauth_access_token=encrypt_secret("secret_access"),
        oauth_refresh_token=encrypt_secret("secret_refresh"),
        webhook_secret=encrypt_secret("secret_webhook"),
        webhook_status="active",
        is_active=True,
    )
    mock_db = AsyncMock()
    with (
        patch("app.modules.jira.services.jira_service.get_jira_integration", new_callable=AsyncMock, return_value=integration),
        patch("app.modules.jira.services.jira_service.is_jira_oauth_enabled", return_value=True),
    ):
        resp = await get_jira_config_response(mock_db, "user_test_a", None, "https://api.example.com")

    dumped = resp.model_dump_json()
    assert "secret_access" not in dumped
    assert "secret_refresh" not in dumped
    assert "secret_webhook" not in dumped
    assert resp.webhook_secret is None
    assert resp.auth_type == "oauth2"
    assert resp.webhook_status == "active"


@pytest.mark.asyncio
async def test_rotating_refresh_token_single_flight_concurrency():
    integration = JiraIntegration(
        id=uuid.uuid4(),
        user_id="user_test_a",
        auth_type="oauth2",
        cloud_id="cloud-123",
        jira_domain="https://acme.atlassian.net",
        jira_email="pm@acme.com",
        oauth_access_token=encrypt_secret("expired_access"),
        oauth_refresh_token=encrypt_secret("refresh_v1"),
        oauth_expires_at=datetime.now(UTC) - timedelta(minutes=5),
        is_active=True,
    )

    mock_db = AsyncMock()
    refresh_calls = 0

    async def fake_post(*args, **kwargs):
        nonlocal refresh_calls
        refresh_calls += 1
        await asyncio.sleep(0.05)
        resp = MagicMock()
        resp.is_success = True
        resp.status_code = 200
        resp.json.return_value = {
            "access_token": "fresh_access_v2",
            "refresh_token": "refresh_v2",
            "expires_in": 3600,
        }
        return resp

    with (
        patch("app.modules.jira.services.jira_oauth_service.is_jira_oauth_enabled", return_value=True),
        patch("app.modules.jira.services.jira_oauth_service.settings.jira_oauth_client_id", "cid"),
        patch("app.modules.jira.services.jira_oauth_service.settings.jira_oauth_client_secret", "csec"),
        patch("app.modules.jira.services.jira_oauth_service.cache.acquire_lock", new_callable=AsyncMock, return_value="lock_tok"),
        patch("app.modules.jira.services.jira_oauth_service.cache.release_lock", new_callable=AsyncMock),
        patch("httpx.AsyncClient.post", side_effect=fake_post),
    ):
        t1, t2 = await asyncio.gather(
            ensure_valid_oauth_token(mock_db, integration),
            ensure_valid_oauth_token(mock_db, integration),
        )

    assert t1 == "fresh_access_v2"
    assert t2 == "fresh_access_v2"
    # Double-checked lock guarantees only ONE token rotation HTTP call occurs
    assert refresh_calls == 1
    assert decrypt_secret(integration.oauth_refresh_token) == "refresh_v2"


@pytest.mark.asyncio
async def test_multi_tenant_webhook_scoping():
    ws_a = uuid.uuid4()
    integ_a = JiraIntegration(
        id=uuid.uuid4(),
        workspace_id=ws_a,
        user_id="user_a",
        jira_domain="https://a.atlassian.net",
        jira_email="a@a.com",
        is_active=True,
    )
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_res

    await handle_jira_webhook(
        db=mock_db,
        event_type="jira:issue_updated",
        issue_data={"key": "PROJ-1", "fields": {"status": {"name": "Done"}}},
        changelog=None,
        integration=integ_a,
    )
    executed_stmt = mock_db.execute.call_args[0][0]
    compiled = str(executed_stmt)
    assert "requirements.workspace_id" in compiled
