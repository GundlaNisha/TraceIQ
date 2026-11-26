"""Atlassian OAuth 2.0 (3LO) authentication, rotating token refresh, and auto-webhook lifecycle."""

from __future__ import annotations

import asyncio
import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache
from app.core.config import settings
from app.core.crypto import decrypt_secret, encrypt_secret
from app.integrations.jira.client import JiraApiError, JiraClient
from app.modules.audit.models.audit import AuditLog
from app.modules.jira.models.jira_integration import JiraIntegration
from app.modules.workspace.models.workspace import WorkspaceMember, WorkspaceRole

logger = logging.getLogger(__name__)

ATLASSIAN_AUTHORIZE_URL = "https://auth.atlassian.com/authorize"
ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
ATLASSIAN_ACCESSIBLE_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"

OAUTH_SCOPES = [
    "read:jira-work",
    "write:jira-work",
    "read:jira-user",
    "manage:jira-webhook",
    "offline_access",
]

# In-process lock map layered beneath Redis distributed locks for single-flight refresh
_LOCAL_REFRESH_LOCKS: dict[str, asyncio.Lock] = {}
_OAUTH_STATE_TTL_SECONDS = 600  # 10 minutes
_TOKEN_REFRESH_BUFFER_SECONDS = 120
_WEBHOOK_TTL_DAYS = 30
_WEBHOOK_REFRESH_THRESHOLD_DAYS = 7


def is_jira_oauth_enabled() -> bool:
    """Return True when Atlassian OAuth 2.0 client credentials are configured."""
    return bool(
        (settings.jira_oauth_client_id or "").strip()
        and (settings.jira_oauth_client_secret or "").strip()
    )


def resolve_public_backend_url(request_base_url: str | None = None) -> str:
    """Return canonical backend base URL preferring explicit PUBLIC_BACKEND_URL."""
    explicit = (settings.public_backend_url or "").strip().rstrip("/")
    if explicit:
        return explicit
    return (request_base_url or "").strip().rstrip("/")


def resolve_oauth_redirect_uri(request_base_url: str | None = None) -> str:
    """Resolve the OAuth callback URL matching Atlassian Developer Console."""
    explicit = (settings.jira_oauth_redirect_uri or "").strip()
    if explicit:
        return explicit
    base = resolve_public_backend_url(request_base_url)
    return f"{base}/api/v1/jira/oauth/callback"


def is_public_https_url(url: str) -> bool:
    """Validate whether a URL is a public HTTPS address acceptable to Jira Cloud webhooks."""
    if not url:
        return False
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1") or host.endswith(".local"):
        return False
    return True


def build_jira_webhook_jql(default_project_key: str | None = None) -> str:
    """Construct a valid JQL filter required by Jira Cloud's dynamic webhook API."""
    proj = (default_project_key or "").strip()
    if proj:
        # Basic sanitization against JQL injection
        safe_proj = "".join(ch for ch in proj if ch.isalnum() or ch in ("_", "-"))
        if safe_proj:
            return f"project = {safe_proj}"
    return "issuetype IS NOT EMPTY"


async def create_oauth_authorization_url(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
    request_base_url: str | None = None,
    frontend_origin: str | None = None,
) -> str:
    """Create a single-use CSRF state token in Redis and build the Atlassian consent URL."""
    if not is_jira_oauth_enabled():
        raise HTTPException(
            status_code=501,
            detail="Jira OAuth 2.0 is not configured on this server (missing JIRA_OAUTH_CLIENT_ID / SECRET).",
        )

    if workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember.role).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        role = mem_res.scalar_one_or_none()
        if role == WorkspaceRole.viewer:
            raise HTTPException(
                status_code=403,
                detail="Workspace viewers cannot configure or modify Jira integrations.",
            )

    state_nonce = secrets.token_urlsafe(32)
    redirect_uri = resolve_oauth_redirect_uri(request_base_url)

    state_payload = {
        "user_id": str(user_id),
        "workspace_id": str(workspace_id) if workspace_id else None,
        "redirect_uri": redirect_uri,
        "public_base": resolve_public_backend_url(request_base_url),
        "frontend_origin": (frontend_origin or settings.frontend_url or "http://localhost:3000").rstrip("/"),
    }
    stored = await cache.set(f"jira:oauth:state:{state_nonce}", state_payload, ttl=_OAUTH_STATE_TTL_SECONDS)
    if not stored:
        raise HTTPException(
            status_code=503,
            detail="Redis cache is unavailable to store OAuth CSRF state safely. Please retry shortly.",
        )

    params = {
        "audience": "api.atlassian.com",
        "client_id": settings.jira_oauth_client_id.strip(),
        "scope": " ".join(OAUTH_SCOPES),
        "redirect_uri": redirect_uri,
        "state": state_nonce,
        "response_type": "code",
        "prompt": "consent",
    }
    return f"{ATLASSIAN_AUTHORIZE_URL}?{urlencode(params)}"


async def _exchange_code_for_tokens(code: str, redirect_uri: str) -> dict[str, Any]:
    """Exchange authorization code for OAuth 2.0 access and rotating refresh tokens."""
    payload = {
        "grant_type": "authorization_code",
        "client_id": settings.jira_oauth_client_id.strip(),
        "client_secret": settings.jira_oauth_client_secret.strip(),
        "code": code,
        "redirect_uri": redirect_uri,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(ATLASSIAN_TOKEN_URL, json=payload)

    if not resp.is_success:
        logger.warning(f"Atlassian OAuth code exchange failed with status {resp.status_code}")
        raise HTTPException(status_code=400, detail="Failed to exchange Jira authorization code.")
    return resp.json()


async def _fetch_accessible_jira_site(access_token: str) -> dict[str, Any]:
    """Discover the user's Jira Cloud site metadata (cloudId, url, scopes)."""
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(ATLASSIAN_ACCESSIBLE_RESOURCES_URL, headers=headers)

    if not resp.is_success:
        logger.warning(f"Atlassian accessible-resources lookup failed with status {resp.status_code}")
        raise HTTPException(status_code=400, detail="Failed to inspect accessible Jira Cloud sites.")

    resources = resp.json()
    if not isinstance(resources, list) or not resources:
        raise HTTPException(
            status_code=400,
            detail="No Jira Cloud sites were authorized for this Atlassian account.",
        )

    # Prefer a site with Jira work scopes
    for site in resources:
        scopes = site.get("scopes") or []
        if "read:jira-work" in scopes or "manage:jira-webhook" in scopes:
            return site
    return resources[0]


async def ensure_valid_oauth_token(
    db: AsyncSession,
    integration: JiraIntegration,
    force_refresh: bool = False,
) -> str:
    """Return a valid OAuth access token, safely refreshing under concurrency if expiring."""
    now = datetime.now(UTC)
    expires_at = integration.oauth_expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    needs_refresh = (
        force_refresh
        or not integration.oauth_access_token
        or expires_at is None
        or (expires_at - now).total_seconds() <= _TOKEN_REFRESH_BUFFER_SECONDS
    )

    if not needs_refresh:
        return decrypt_secret(integration.oauth_access_token)

    if not is_jira_oauth_enabled():
        raise JiraApiError(
            "Jira OAuth client credentials are not configured to refresh access tokens.",
            status_code=500,
        )

    integ_key = str(integration.id)
    local_lock = _LOCAL_REFRESH_LOCKS.setdefault(integ_key, asyncio.Lock())

    async with local_lock:
        redis_lock_key = f"jira:token_refresh:{integ_key}"
        lock_token = await cache.acquire_lock(redis_lock_key, ttl=15)

        # Wait briefly if another worker holds the Redis lock
        if lock_token is None:
            for _ in range(10):
                await asyncio.sleep(0.3)
                lock_token = await cache.acquire_lock(redis_lock_key, ttl=15)
                if lock_token is not None:
                    break

        try:
            # Double-checked reload: another worker may have just rotated tokens
            await db.refresh(integration)
            refreshed_exp = integration.oauth_expires_at
            if refreshed_exp is not None and refreshed_exp.tzinfo is None:
                refreshed_exp = refreshed_exp.replace(tzinfo=UTC)

            if (
                not force_refresh
                and integration.oauth_access_token
                and refreshed_exp is not None
                and (refreshed_exp - datetime.now(UTC)).total_seconds() > _TOKEN_REFRESH_BUFFER_SECONDS
            ):
                return decrypt_secret(integration.oauth_access_token)

            refresh_token = decrypt_secret(integration.oauth_refresh_token)
            if not refresh_token:
                integration.is_active = False
                await db.commit()
                raise JiraApiError(
                    "Jira OAuth refresh token missing. Please reconnect Jira via OAuth.",
                    status_code=401,
                )

            payload = {
                "grant_type": "refresh_token",
                "client_id": settings.jira_oauth_client_id.strip(),
                "client_secret": settings.jira_oauth_client_secret.strip(),
                "refresh_token": refresh_token,
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(ATLASSIAN_TOKEN_URL, json=payload)

            if not resp.is_success:
                logger.warning(
                    f"Atlassian OAuth refresh failed for integration {integ_key}: status {resp.status_code}"
                )
                if resp.status_code in (400, 401, 403):
                    integration.is_active = False
                    await db.commit()
                raise JiraApiError(
                    "Jira authorization expired or was revoked. Please click 'Reconnect Jira'.",
                    status_code=401,
                )

            token_data = resp.json()
            new_access = token_data.get("access_token", "")
            new_refresh = token_data.get("refresh_token") or refresh_token
            expires_in = int(token_data.get("expires_in", 3600))

            integration.oauth_access_token = encrypt_secret(new_access)
            integration.oauth_refresh_token = encrypt_secret(new_refresh)
            integration.oauth_expires_at = datetime.now(UTC) + timedelta(seconds=expires_in)
            await db.commit()
            await db.refresh(integration)
            return new_access
        finally:
            if lock_token:
                await cache.release_lock(redis_lock_key, lock_token)


async def ensure_active_dynamic_webhook(
    db: AsyncSession,
    client: JiraClient,
    integration: JiraIntegration,
    public_base_url: str | None = None,
    force_reregister: bool = False,
) -> None:
    """Register or renew Jira Cloud OAuth 2.0 dynamic webhooks safely."""
    if integration.auth_type != "oauth2" or not integration.cloud_id:
        return

    base = resolve_public_backend_url(public_base_url)
    if not is_public_https_url(base):
        if integration.webhook_status != "active":
            integration.webhook_status = "skipped_localhost"
            await db.commit()
        return

    now = datetime.now(UTC)
    wh_exp = integration.webhook_expires_at
    if wh_exp is not None and wh_exp.tzinfo is None:
        wh_exp = wh_exp.replace(tzinfo=UTC)

    # 1. If already active and far from expiry, nothing to do unless forced
    if (
        not force_reregister
        and integration.jira_webhook_id
        and integration.webhook_status == "active"
        and wh_exp is not None
        and (wh_exp - now).days > _WEBHOOK_REFRESH_THRESHOLD_DAYS
    ):
        return

    # 2. If active webhook exists and is nearing expiration, extend its 30-day TTL
    if not force_reregister and integration.jira_webhook_id and integration.webhook_status == "active":
        try:
            await client.refresh_dynamic_webhooks([integration.jira_webhook_id])
            integration.webhook_expires_at = now + timedelta(days=_WEBHOOK_TTL_DAYS)
            await db.commit()
            return
        except JiraApiError as exc:
            logger.info(
                f"Dynamic webhook {integration.jira_webhook_id} refresh failed ({exc.message}); re-registering."
            )

    # 3. Clean up old webhook if present before creating a fresh one
    if integration.jira_webhook_id:
        try:
            await client.delete_dynamic_webhooks([integration.jira_webhook_id])
        except Exception:
            pass

    # 4. Ensure encrypted webhook secret & register callback URL over HTTPS
    plain_secret = decrypt_secret(integration.webhook_secret)
    if not plain_secret:
        plain_secret = secrets.token_urlsafe(32)
        integration.webhook_secret = encrypt_secret(plain_secret)

    webhook_url = f"{base}/api/v1/jira/webhook?secret={plain_secret}"
    jql_filter = build_jira_webhook_jql(integration.default_project_key)

    try:
        new_wh_id = await client.register_dynamic_webhook(
            webhook_url=webhook_url,
            jql_filter=jql_filter,
            events=["jira:issue_updated", "jira:issue_deleted"],
        )
        integration.jira_webhook_id = new_wh_id
        integration.webhook_expires_at = now + timedelta(days=_WEBHOOK_TTL_DAYS)
        integration.webhook_status = "active"
    except JiraApiError as exc:
        logger.warning(f"Could not register dynamic Jira webhook for cloudId={integration.cloud_id}: {exc.message}")
        integration.webhook_status = "error"

    await db.commit()


async def handle_oauth_callback(
    db: AsyncSession,
    code: str,
    state: str,
) -> tuple[str, JiraIntegration]:
    """Verify OAuth state, store encrypted tokens, register webhook, and return redirect URL."""
    state_data = await cache.pop(f"jira:oauth:state:{state}")
    if not isinstance(state_data, dict) or not state_data.get("user_id"):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state token. Please try connecting Jira again.",
        )

    user_id: str = state_data["user_id"]
    raw_ws = state_data.get("workspace_id")
    workspace_id = uuid.UUID(raw_ws) if raw_ws else None
    redirect_uri = state_data.get("redirect_uri") or resolve_oauth_redirect_uri()
    public_base = state_data.get("public_base") or resolve_public_backend_url()
    frontend_origin = (state_data.get("frontend_origin") or settings.frontend_url or "http://localhost:3000").rstrip("/")

    # Exchange code -> tokens
    token_data = await _exchange_code_for_tokens(code=code, redirect_uri=redirect_uri)
    access_token = token_data.get("access_token", "")
    refresh_token = token_data.get("refresh_token", "")
    expires_in = int(token_data.get("expires_in", 3600))
    scope_str = token_data.get("scope", " ".join(OAUTH_SCOPES))

    if not access_token:
        raise HTTPException(status_code=400, detail="Atlassian OAuth did not return an access token.")

    # Resolve authorized Jira site & user identity
    site = await _fetch_accessible_jira_site(access_token)
    cloud_id = str(site["id"])
    site_url = str(site.get("url") or f"https://api.atlassian.com/ex/jira/{cloud_id}").rstrip("/")

    client = JiraClient(
        domain=site_url,
        auth_type="oauth2",
        access_token=access_token,
        cloud_id=cloud_id,
    )
    jira_email = "oauth-user@atlassian"
    try:
        profile = await client.test_connection()
        jira_email = profile.get("email_address") or profile.get("display_name") or jira_email
    except JiraApiError as profile_err:
        logger.info(f"OAuth /myself lookup skipped (scope optional): {profile_err.message}")

    # Find existing active/inactive integration for workspace or user
    stmt = select(JiraIntegration).order_by(JiraIntegration.updated_at.desc())
    if workspace_id:
        stmt = stmt.where(JiraIntegration.workspace_id == workspace_id)
    else:
        stmt = stmt.where(JiraIntegration.user_id == user_id, JiraIntegration.workspace_id.is_(None))
    integration = (await db.execute(stmt)).scalars().first()

    now = datetime.now(UTC)
    plain_secret = secrets.token_urlsafe(32)
    if integration and integration.webhook_secret:
        plain_secret = decrypt_secret(integration.webhook_secret) or plain_secret

    if integration:
        integration.user_id = user_id
        integration.auth_type = "oauth2"
        integration.cloud_id = cloud_id
        integration.jira_domain = site_url
        integration.jira_email = jira_email
        integration.jira_api_token = None
        integration.oauth_access_token = encrypt_secret(access_token)
        if refresh_token:
            integration.oauth_refresh_token = encrypt_secret(refresh_token)
        integration.oauth_expires_at = now + timedelta(seconds=expires_in)
        integration.oauth_scopes = scope_str
        integration.webhook_secret = encrypt_secret(plain_secret)
        integration.is_active = True
    else:
        integration = JiraIntegration(
            workspace_id=workspace_id,
            user_id=user_id,
            auth_type="oauth2",
            cloud_id=cloud_id,
            jira_domain=site_url,
            jira_email=jira_email,
            jira_api_token=None,
            oauth_access_token=encrypt_secret(access_token),
            oauth_refresh_token=encrypt_secret(refresh_token) if refresh_token else None,
            oauth_expires_at=now + timedelta(seconds=expires_in),
            oauth_scopes=scope_str,
            webhook_secret=encrypt_secret(plain_secret),
            webhook_status="skipped_localhost",
            is_active=True,
        )
        db.add(integration)

    audit = AuditLog(
        user_id=str(user_id),
        action="jira_integration.oauth_connect",
        resource_type="jira_integration",
        resource_id=str(workspace_id or user_id),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(integration)

    # Register dynamic webhook automatically if public HTTPS URL is available
    await ensure_active_dynamic_webhook(
        db=db,
        client=client,
        integration=integration,
        public_base_url=public_base,
        force_reregister=True,
    )

    if workspace_id:
        await cache.invalidate_workspace(workspace_id, "jira")
    else:
        await cache.invalidate_user(user_id, "jira")

    redirect_target = f"{frontend_origin}/requirements?jira_connected=1"
    return redirect_target, integration
