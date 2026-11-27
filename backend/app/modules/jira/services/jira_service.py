"""Jira Integration business logic and service methods."""

from __future__ import annotations

import logging
import secrets as _secrets
import uuid
from datetime import UTC, datetime
from typing import Any
from typing import Any
from typing import Any

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.crypto import decrypt_secret, encrypt_secret
from app.integrations.jira.client import JiraApiError, JiraClient, normalize_jira_url
from app.modules.audit.models.audit import AuditLog
from app.modules.jira.models.jira_integration import JiraIntegration
from app.modules.jira.services.jira_oauth_service import (
    ensure_active_dynamic_webhook,
    ensure_valid_oauth_token,
    is_jira_oauth_enabled,
    resolve_public_backend_url,
)
from app.modules.jira.schemas.jira_schemas import (
    JiraBatchImportResponse,
    JiraBoardItem,
    JiraConfigResponse,
    JiraImportResult,
    JiraIssueDetailResponse,
    JiraIssueTypeItem,
    JiraPostCommentResponse,
    JiraProjectItem,
    JiraSearchResponse,
    JiraSprintItem,
    JiraStatusItem,
    JiraSyncAllResponse,
    JiraSyncResponse,
    JiraTestConnectionResponse,
    JiraTransitionResponse,
    JiraWebhookSecretResponse,
    JiraWebhookTestResponse,
)
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement, RequirementVersion
from app.modules.requirement.services.req_service import create_requirement
from app.modules.workspace.models.workspace import WorkspaceMember, WorkspaceRole

logger = logging.getLogger(__name__)


def get_request_base_url(request: Request) -> str:
    """Extract public base URL respecting reverse proxies and PUBLIC_BACKEND_URL override."""
    if settings.public_backend_url and settings.public_backend_url.strip():
        return settings.public_backend_url.strip().rstrip("/")
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    if host:
        return f"{proto}://{host}".rstrip("/")
    return str(request.base_url).rstrip("/")


def mask_token(token: str | None) -> str:
    """Mask Atlassian API token for safe display in UI/responses."""
    if not token:
        return ""
    if len(token) <= 8:
        return "********"
    return f"{token[:4]}...{token[-4:]}"


async def get_active_jira_client(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
    public_base_url: str | None = None,
) -> tuple[JiraClient, JiraIntegration]:
    """Retrieve active JiraIntegration and instantiate a configured JiraClient (OAuth2 or API Token)."""
    integration = await get_jira_integration(db, user_id, workspace_id)
    if not integration or not integration.is_active:
        raise HTTPException(
            status_code=400,
            detail="Jira is not configured for this workspace. Please configure your Jira connection in workspace settings.",
        )

    if integration.auth_type == "oauth2" and integration.cloud_id:
        access_token = await ensure_valid_oauth_token(db, integration)

        async def _refresh_cb() -> str:
            return await ensure_valid_oauth_token(db, integration, force_refresh=True)

        client = JiraClient(
            domain=integration.jira_domain,
            email=integration.jira_email,
            auth_type="oauth2",
            access_token=access_token,
            cloud_id=integration.cloud_id,
            on_token_refresh=_refresh_cb,
        )
        # Lazy keepalive for 30-day Jira dynamic webhook TTL
        try:
            await ensure_active_dynamic_webhook(
                db=db,
                client=client,
                integration=integration,
                public_base_url=public_base_url,
            )
        except Exception as wh_err:
            logger.debug(f"Webhook keepalive check skipped: {wh_err}")
        return client, integration

    raw_api_token = decrypt_secret(integration.jira_api_token)
    client = JiraClient(
        domain=integration.jira_domain,
        email=integration.jira_email,
        api_token=raw_api_token,
    )
    return client, integration


async def get_jira_integration(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
) -> JiraIntegration | None:
    """Find Jira integration for workspace or fallback to user."""
    if workspace_id:
        stmt = (
            select(JiraIntegration)
            .where(
                JiraIntegration.workspace_id == workspace_id,
                JiraIntegration.is_active.is_(True),
            )
            .order_by(JiraIntegration.updated_at.desc())
        )
        res = await db.execute(stmt)
        integration = res.scalars().first()
        if integration:
            return integration

    # Fallback to user-level
    stmt = (
        select(JiraIntegration)
        .where(
            JiraIntegration.user_id == user_id,
            JiraIntegration.is_active.is_(True),
        )
        .order_by(JiraIntegration.updated_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().first()


async def get_jira_config_response(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
    base_url: str | None = None,
) -> JiraConfigResponse:
    """Get current Jira configuration details without exposing OAuth tokens or raw API tokens."""
    oauth_enabled = is_jira_oauth_enabled()
    integration = await get_jira_integration(db, user_id, workspace_id)
    if not integration:
        return JiraConfigResponse(
            id=None,
            workspace_id=workspace_id,
            auth_type="api_token",
            cloud_id=None,
            oauth_enabled=oauth_enabled,
            jira_domain="",
            jira_email="",
            default_project_key=None,
            is_active=False,
            is_configured=False,
            token_preview="",
            webhook_url=None,
            webhook_secret=None,
            webhook_status="manual",
            webhook_expires_at=None,
            created_at=None,
            updated_at=None,
        )

    # Ensure integration has a stable encrypted webhook secret initialized
    if not integration.webhook_secret:
        integration.webhook_secret = encrypt_secret(_secrets.token_urlsafe(32))
        await db.commit()
        await db.refresh(integration)

    effective_base = resolve_public_backend_url(base_url)
    webhook_url = f"{effective_base}/api/v1/jira/webhook" if effective_base else None
    is_oauth = integration.auth_type == "oauth2"

    # Never expose webhook_secret in OAuth2 mode (auto-managed server-side);
    # only decrypt and return for manual API-token setup instructions.
    exposed_webhook_secret = None if is_oauth else decrypt_secret(integration.webhook_secret)
    token_preview = (
        "OAuth 2.0 (Auto-Refreshed)"
        if is_oauth
        else mask_token(decrypt_secret(integration.jira_api_token))
    )

    return JiraConfigResponse(
        id=integration.id,
        workspace_id=integration.workspace_id,
        auth_type=integration.auth_type,
        cloud_id=integration.cloud_id,
        oauth_enabled=oauth_enabled,
        jira_domain=integration.jira_domain,
        jira_email=integration.jira_email,
        default_project_key=integration.default_project_key,
        is_active=integration.is_active,
        is_configured=True,
        token_preview=token_preview,
        webhook_url=webhook_url,
        webhook_secret=exposed_webhook_secret,
        webhook_status=integration.webhook_status,
        webhook_expires_at=integration.webhook_expires_at,
        created_at=integration.created_at,
        updated_at=integration.updated_at,
    )


async def test_jira_credentials(
    domain: str,
    email: str,
    api_token: str,
) -> JiraTestConnectionResponse:
    """Test connection using provided credentials."""
    try:
        norm_domain = normalize_jira_url(domain)
        client = JiraClient(domain=norm_domain, email=email, api_token=api_token)
        profile = await client.test_connection()
        return JiraTestConnectionResponse(
            success=True,
            account_id=profile.get("account_id"),
            display_name=profile.get("display_name"),
            email_address=profile.get("email_address"),
            jira_url=profile.get("jira_url"),
            message=f"Successfully connected to Jira as {profile.get('display_name') or email}.",
        )
    except JiraApiError as e:
        return JiraTestConnectionResponse(
            success=False,
            message=e.message,
        )
    except Exception as e:
        logger.error(f"Unexpected error testing Jira connection: {e}")
        return JiraTestConnectionResponse(
            success=False,
            message=f"Connection test failed: {e!s}",
        )


async def save_jira_config(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
    domain: str,
    email: str,
    api_token: str,
    default_project_key: str | None = None,
    webhook_secret: str | None = None,
    base_url: str | None = None,
) -> JiraConfigResponse:
    """Verify credentials and save or update Jira integration."""
    norm_domain = normalize_jira_url(domain)

    # Validate credentials before saving
    test_res = await test_jira_credentials(norm_domain, email, api_token)
    if not test_res.success:
        raise HTTPException(status_code=400, detail=f"Jira verification failed: {test_res.message}")

    # Check if integration already exists for this workspace / user
    integration = await get_jira_integration(db, user_id, workspace_id)
    enc_api_token = encrypt_secret(api_token.strip())
    if integration:
        integration.auth_type = "api_token"
        integration.cloud_id = None
        integration.oauth_access_token = None
        integration.oauth_refresh_token = None
        integration.oauth_expires_at = None
        integration.oauth_scopes = None
        integration.jira_webhook_id = None
        integration.webhook_expires_at = None
        integration.webhook_status = "manual"
        integration.jira_domain = norm_domain
        integration.jira_email = email.strip()
        integration.jira_api_token = enc_api_token
        integration.default_project_key = default_project_key.strip() if default_project_key else None
        if webhook_secret and webhook_secret.strip():
            integration.webhook_secret = encrypt_secret(webhook_secret.strip())
        elif not integration.webhook_secret:
            integration.webhook_secret = encrypt_secret(_secrets.token_urlsafe(32))
        integration.is_active = True
    else:
        raw_secret = (
            webhook_secret.strip()
            if (webhook_secret and webhook_secret.strip())
            else _secrets.token_urlsafe(32)
        )
        integration = JiraIntegration(
            workspace_id=workspace_id,
            user_id=user_id,
            auth_type="api_token",
            jira_domain=norm_domain,
            jira_email=email.strip(),
            jira_api_token=enc_api_token,
            default_project_key=default_project_key.strip() if default_project_key else None,
            webhook_secret=encrypt_secret(raw_secret),
            webhook_status="manual",
            is_active=True,
        )
        db.add(integration)

    audit = AuditLog(
        user_id=str(user_id),
        action="jira_integration.configure",
        resource_type="jira_integration",
        resource_id=str(workspace_id or user_id),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(integration)

    return await get_jira_config_response(db, user_id, workspace_id, base_url=base_url)


async def delete_jira_config(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
) -> None:
    """Remove active Jira integration for workspace or user, cleaning up OAuth webhooks."""
    integration = await get_jira_integration(db, user_id, workspace_id)
    if integration:
        if integration.auth_type == "oauth2" and integration.cloud_id and integration.jira_webhook_id:
            try:
                access_token = await ensure_valid_oauth_token(db, integration)
                client = JiraClient(
                    domain=integration.jira_domain,
                    email=integration.jira_email,
                    auth_type="oauth2",
                    access_token=access_token,
                    cloud_id=integration.cloud_id,
                )
                await client.delete_dynamic_webhooks([integration.jira_webhook_id])
            except Exception as wh_err:
                logger.warning(f"Best-effort cleanup of Jira webhook failed during disconnect: {wh_err}")

        await db.delete(integration)
        audit = AuditLog(
            user_id=str(user_id),
            action="jira_integration.delete",
            resource_type="jira_integration",
            resource_id=str(integration.id),
        )
        db.add(audit)
        await db.commit()


async def list_jira_projects(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
) -> list[JiraProjectItem]:
    """Fetch all accessible projects from configured Jira instance."""
    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        raw_projects = await client.get_projects()
        return [JiraProjectItem(**p) for p in raw_projects]
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


async def list_jira_issue_types(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
) -> list[JiraIssueTypeItem]:
    """Fetch all issue types from configured Jira instance."""
    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        raw_types = await client.get_issue_types()
        return [JiraIssueTypeItem(**t) for t in raw_types]
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


async def list_jira_statuses(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
) -> list[JiraStatusItem]:
    """Fetch all statuses from configured Jira instance."""
    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        raw_statuses = await client.get_statuses()
        return [JiraStatusItem(**s) for s in raw_statuses]
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


async def list_jira_boards(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
    project_key: str | None = None,
) -> list[JiraBoardItem]:
    """Fetch Kanban and Scrum boards from configured Jira instance."""
    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        raw_boards = await client.get_boards(project_key_or_id=project_key)
        return [JiraBoardItem(**b) for b in raw_boards]
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


async def list_jira_sprints(
    db: AsyncSession,
    user_id: str,
    board_id: int | str,
    workspace_id: uuid.UUID | None = None,
) -> list[JiraSprintItem]:
    """Fetch sprints for a Scrum board."""
    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        raw_sprints = await client.get_board_sprints(board_id=board_id)
        return [JiraSprintItem(**s) for s in raw_sprints]
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


async def search_jira_issues(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
    query: str = "",
    project_key: str | None = None,
    issue_type: str | None = None,
    status: str | None = None,
    status_category: str | None = None,
    board_id: int | str | None = None,
    sprint_id: int | str | None = None,
    jql: str = "",
    start_at: int = 0,
    max_results: int = 50,
) -> JiraSearchResponse:
    """Search issues using Jira REST API."""
    client, integration = await get_active_jira_client(db, user_id, workspace_id)
    effective_project = project_key or integration.default_project_key

    try:
        res = await client.search_issues(
            jql=jql,
            query=query,
            project_key=effective_project,
            issue_type=issue_type,
            status=status,
            status_category=status_category,
            board_id=board_id,
            sprint_id=sprint_id,
            start_at=start_at,
            max_results=max_results,
        )
        return JiraSearchResponse(**res)
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


async def get_jira_issue_detail(
    db: AsyncSession,
    user_id: str,
    issue_key: str,
    workspace_id: uuid.UUID | None = None,
) -> JiraIssueDetailResponse:
    """Fetch single issue details with markdown formatted description."""
    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        detail = await client.get_issue(issue_key)
        return JiraIssueDetailResponse(**detail)
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


async def _upsert_jira_requirement(
    db: AsyncSession,
    user_id: str,
    repo: Repository,
    workspace_id: uuid.UUID | None,
    issue: dict[str, Any],
    custom_title: str | None = None,
    custom_text: str | None = None,
) -> Requirement:
    """Create or update a TraceIQ Requirement from a fetched Jira issue without duplicating."""
    final_title = (custom_title or f"[{issue['key']}] {issue['summary']}").strip()
    final_text = (custom_text or issue["description_markdown"]).strip()
    if not final_text:
        final_text = (
            f"Requirement imported from Jira issue [{issue['key']}]({issue['url']}): {issue['summary']}"
        )

    existing_res = await db.execute(
        select(Requirement).where(
            Requirement.repository_id == repo.id,
            Requirement.jira_issue_key == issue["key"],
        )
    )
    existing = existing_res.scalars().first()
    now_naive = datetime.now(UTC).replace(tzinfo=None)

    if existing:
        existing.jira_issue_id = issue.get("id") or existing.jira_issue_id
        existing.jira_issue_url = issue.get("url") or existing.jira_issue_url
        existing.jira_status = issue.get("status")
        existing.jira_priority = issue.get("priority")
        existing.jira_issue_type = issue.get("issue_type")
        existing.jira_synced_at = now_naive

        if existing.title != final_title or existing.text != final_text:
            existing.title = final_title
            existing.text = final_text
            existing.version_number += 1
            db.add(
                RequirementVersion(
                    requirement_id=existing.id,
                    version_number=existing.version_number,
                    title=final_title,
                    text=final_text,
                )
            )
        await db.commit()
        await db.refresh(existing)
        return existing

    return await create_requirement(
        db=db,
        user_id=user_id,
        repository_id=repo.id,
        title=final_title,
        text=final_text,
        workspace_id=repo.workspace_id or workspace_id,
        jira_issue_key=issue["key"],
        jira_issue_id=issue["id"],
        jira_issue_url=issue["url"],
        jira_status=issue["status"],
        jira_priority=issue["priority"],
        jira_issue_type=issue["issue_type"],
        jira_synced_at=now_naive,
    )


async def import_jira_issue(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
    repo_id: uuid.UUID,
    issue_key: str,
    custom_title: str | None = None,
    custom_text: str | None = None,
) -> JiraImportResult:
    """Import a single Jira issue as a TraceIQ requirement."""
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        issue = await client.get_issue(issue_key)
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to fetch Jira issue {issue_key}: {e.message}")

    req = await _upsert_jira_requirement(
        db=db,
        user_id=user_id,
        repo=repo,
        workspace_id=workspace_id,
        issue=issue,
        custom_title=custom_title,
        custom_text=custom_text,
    )

    audit = AuditLog(
        user_id=str(user_id),
        action="requirement.import_jira",
        resource_type="requirement",
        resource_id=str(req.id),
    )
    db.add(audit)
    await db.commit()

    return JiraImportResult(
        requirement_id=req.id,
        title=req.title,
        jira_issue_key=req.jira_issue_key or issue["key"],
        jira_issue_url=req.jira_issue_url or issue["url"],
        jira_status=req.jira_status,
        jira_issue_type=req.jira_issue_type,
        version_number=req.version_number,
    )


async def batch_import_jira_issues(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
    repo_id: uuid.UUID,
    issue_keys: list[str],
) -> JiraBatchImportResponse:
    """Import multiple Jira issues in batch."""
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    client, _ = await get_active_jira_client(db, user_id, workspace_id)

    imported: list[JiraImportResult] = []
    failed: list[dict[str, str]] = []

    for raw_key in issue_keys:
        key = raw_key.strip()
        if not key:
            continue
        try:
            issue = await client.get_issue(key)
            req = await _upsert_jira_requirement(
                db=db,
                user_id=user_id,
                repo=repo,
                workspace_id=workspace_id,
                issue=issue,
            )
            imported.append(
                JiraImportResult(
                    requirement_id=req.id,
                    title=req.title,
                    jira_issue_key=req.jira_issue_key or issue["key"],
                    jira_issue_url=req.jira_issue_url or issue["url"],
                    jira_status=req.jira_status,
                    jira_issue_type=req.jira_issue_type,
                    version_number=req.version_number,
                )
            )
        except Exception as e:
            logger.error(f"Failed to import Jira issue {key}: {e}")
            failed.append({"key": key, "error": str(e)})

    return JiraBatchImportResponse(
        imported=imported,
        failed=failed,
        total_imported=len(imported),
        total_requested=len(issue_keys),
    )


def _apply_jira_issue_update(
    db: AsyncSession,
    req: Requirement,
    *,
    new_title: str | None = None,
    new_text: str | None = None,
    new_status: str | None = None,
    new_priority: str | None = None,
    new_type: str | None = None,
    now_naive: datetime | None = None,
) -> tuple[bool, bool]:
    """Apply upstream Jira metadata/content updates to a Requirement.

    Returns (content_updated, any_updated). Appends a new RequirementVersion row
    whenever title or text changed so full specification history is preserved.
    """
    ts = now_naive or datetime.now(UTC).replace(tzinfo=None)
    any_updated = False

    if new_status and req.jira_status != new_status:
        req.jira_status = new_status
        any_updated = True
    if new_priority and req.jira_priority != new_priority:
        req.jira_priority = new_priority
        any_updated = True
    if new_type and req.jira_issue_type != new_type:
        req.jira_issue_type = new_type
        any_updated = True

    title_candidate = new_title.strip() if isinstance(new_title, str) and new_title.strip() else req.title
    text_candidate = new_text.strip() if isinstance(new_text, str) and new_text.strip() else req.text

    content_updated = (title_candidate != req.title) or (text_candidate != req.text)
    if content_updated:
        req.title = title_candidate
        req.text = text_candidate
        req.version_number = (req.version_number or 1) + 1
        db.add(
            RequirementVersion(
                requirement_id=req.id,
                version_number=req.version_number,
                title=title_candidate,
                text=text_candidate,
            )
        )
        any_updated = True

    if any_updated:
        req.jira_synced_at = ts

    return content_updated, any_updated


async def sync_jira_requirement(
    db: AsyncSession,
    user_id: str,
    requirement_id: uuid.UUID,
    workspace_id: uuid.UUID | None = None,
) -> JiraSyncResponse:
    """Re-sync an existing requirement with its upstream Jira issue."""
    req = await db.get(Requirement, requirement_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    if not req.jira_issue_key:
        raise HTTPException(status_code=400, detail="This requirement is not linked to a Jira issue.")

    client, _ = await get_active_jira_client(db, user_id, req.workspace_id or workspace_id)
    try:
        issue = await client.get_issue(req.jira_issue_key)
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to fetch updated issue from Jira: {e.message}")

    jira_title = f"[{issue['key']}] {issue['summary']}".strip()
    jira_text = issue["description_markdown"].strip()

    was_updated, any_updated = _apply_jira_issue_update(
        db,
        req,
        new_title=jira_title,
        new_text=jira_text,
        new_status=issue.get("status"),
        new_priority=issue.get("priority"),
        new_type=issue.get("issue_type"),
    )
    if not any_updated:
        req.jira_synced_at = datetime.now(UTC).replace(tzinfo=None)

    audit = AuditLog(
        user_id=str(user_id),
        action="requirement.jira_sync",
        resource_type="requirement",
        resource_id=str(req.id),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(req)

    msg = "Requirement successfully updated with latest Jira changes." if (was_updated or any_updated) else "Requirement is already up-to-date with Jira."
    return JiraSyncResponse(
        requirement_id=req.id,
        title=req.title,
        version_number=req.version_number,
        jira_issue_key=req.jira_issue_key,
        jira_status=req.jira_status,
        was_updated=was_updated,
        message=msg,
    )


async def sync_all_jira_requirements(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None = None,
    repo_id: uuid.UUID | None = None,
    force: bool = False,
) -> "JiraSyncAllResponse":
    """Batch re-sync all Jira-linked requirements in scope in one upstream query."""
    from app.core.cache import cache

    integration = await get_jira_integration(db, user_id, workspace_id)
    if not integration or not integration.is_active:
        return JiraSyncAllResponse(
            checked=0,
            updated=0,
            skipped=True,
            message="Jira is not configured for this workspace.",
        )

    scope_key = f"{workspace_id or user_id}:{repo_id or 'all'}"
    cooldown_key = f"jira:autosync_cooldown:{scope_key}"
    if not force:
        recently_synced = await cache.get(cooldown_key)
        if recently_synced:
            return JiraSyncAllResponse(
                checked=0,
                updated=0,
                skipped=True,
                message="Skipped auto-sync (recently checked).",
            )

    stmt = select(Requirement).where(Requirement.jira_issue_key.is_not(None))
    if workspace_id:
        stmt = stmt.where(Requirement.workspace_id == workspace_id)
    else:
        stmt = stmt.where(Requirement.user_id == user_id)
    if repo_id:
        stmt = stmt.where(Requirement.repository_id == repo_id)

    reqs = list((await db.execute(stmt)).scalars().all())
    if not reqs:
        return JiraSyncAllResponse(
            checked=0,
            updated=0,
            skipped=False,
            message="No Jira-linked requirements to sync.",
        )

    await cache.set(cooldown_key, True, ttl=10)

    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    unique_keys = sorted({r.jira_issue_key for r in reqs if r.jira_issue_key})
    try:
        upstream_map = await client.get_issues_by_keys(unique_keys)
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=f"Auto-sync failed: {e.message}") from e

    now_naive = datetime.now(UTC).replace(tzinfo=None)
    updated_keys: list[str] = []
    for req in reqs:
        if not req.jira_issue_key or req.jira_issue_key not in upstream_map:
            continue
        issue = upstream_map[req.jira_issue_key]
        jira_title = f"[{issue['key']}] {issue['summary']}".strip()
        jira_text = issue["description_markdown"].strip()

        content_changed, any_changed = _apply_jira_issue_update(
            db,
            req,
            new_title=jira_title,
            new_text=jira_text,
            new_status=issue.get("status"),
            new_priority=issue.get("priority"),
            new_type=issue.get("issue_type"),
            now_naive=now_naive,
        )
        if any_changed:
            updated_keys.append(req.jira_issue_key)
            if content_changed:
                db.add(
                    AuditLog(
                        user_id=str(req.user_id or user_id),
                        action="jira.auto_sync",
                        resource_type="requirement",
                        resource_id=str(req.id),
                    )
                )

    if updated_keys:
        await db.commit()
    else:
        await db.flush()

    return JiraSyncAllResponse(
        checked=len(reqs),
        updated=len(updated_keys),
        updated_keys=updated_keys,
        skipped=False,
        message=(
            f"Auto-synced {len(updated_keys)} updated requirement(s) from Jira."
            if updated_keys
            else "All Jira requirements are up-to-date."
        ),
    )


# ---------------------------------------------------------------------------
# Phase 2: Transitions, Comment Posting, Webhook Handling
# ---------------------------------------------------------------------------

import secrets as _secrets


def _build_auto_comment(req: Requirement) -> str:
    """Build a structured TraceIQ summary comment for posting to Jira."""
    lines = [
        "## 🔍 TraceIQ Analysis Update",
        "",
        f"**Requirement**: {req.title}",
        f"**Version**: v{req.version_number}",
    ]
    if req.jira_status:
        lines.append(f"**Jira Status (TraceIQ)**: {req.jira_status}")
    lines += [
        "",
        "---",
        "_This comment was automatically posted by [TraceIQ](https://github.com/GundlaNisha/TraceIQ) "
        "— Autonomous Code Impact Analysis & Traceability Platform._",
    ]
    return "\n".join(lines)


async def get_issue_transitions(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
    issue_key: str,
) -> list:
    """Fetch available workflow transitions for a Jira issue.

    Returns:
        List of JiraTransitionItem dicts.
    """
    from app.modules.jira.schemas.jira_schemas import JiraTransitionItem

    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        transitions = await client.get_issue_transitions(issue_key)
        return [JiraTransitionItem(**t) for t in transitions]
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e


async def transition_jira_issue(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
    requirement_id: uuid.UUID,
    transition_id: str,
    post_comment_flag: bool = False,
    comment_text: str | None = None,
) -> "JiraTransitionResponse":
    """Transition a linked Jira issue status from TraceIQ.

    Optionally posts a comment confirming the transition.
    Updates requirement.jira_status in the database.
    """
    from app.modules.jira.schemas.jira_schemas import JiraTransitionResponse

    # Load requirement and ensure Jira key exists
    stmt = select(Requirement).where(Requirement.id == requirement_id)
    res = await db.execute(stmt)
    req: Requirement | None = res.scalars().first()

    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found.")
    if not req.jira_issue_key:
        raise HTTPException(
            status_code=400,
            detail="This requirement is not linked to a Jira issue.",
        )

    client, _ = await get_active_jira_client(db, user_id, workspace_id)

    try:
        await client.transition_issue(req.jira_issue_key, transition_id)
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e

    # Fetch updated issue to get the new status name
    try:
        updated_issue = await client.get_issue(req.jira_issue_key)
        new_status = updated_issue.get("status", "")
    except JiraApiError:
        new_status = ""

    # Persist updated Jira status on the requirement
    if new_status:
        req.jira_status = new_status
        req.jira_synced_at = datetime.now(UTC).replace(tzinfo=None).replace(tzinfo=None)

    # Optionally post a confirmation comment on Jira
    if post_comment_flag:
        body = comment_text or (
            f"✅ **TraceIQ** transitioned this issue to **{new_status}** "
            f"after completing code impact analysis for requirement: _{req.title}_."
        )
        try:
            await client.post_comment(req.jira_issue_key, body)
        except JiraApiError as e:
            logger.warning(f"Failed to post comment after transition on {req.jira_issue_key}: {e}")

    # AuditLog
    audit = AuditLog(
        user_id=str(user_id),
        action="jira.issue_transition",
        resource_type="requirement",
        resource_id=str(req.id),
    )
    db.add(audit)
    await db.commit()

    return JiraTransitionResponse(
        success=True,
        issue_key=req.jira_issue_key,
        new_status=new_status or None,
        message=f"Jira issue {req.jira_issue_key} transitioned successfully."
        + (f" New status: {new_status}." if new_status else ""),
    )


async def post_jira_comment(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
    requirement_id: uuid.UUID,
    comment_body: str | None = None,
) -> "JiraPostCommentResponse":
    """Post a TraceIQ impact analysis summary (or custom text) to the linked Jira issue.

    If comment_body is omitted, auto-generates a structured comment from the requirement.
    """
    from app.modules.jira.schemas.jira_schemas import JiraPostCommentResponse

    stmt = select(Requirement).where(Requirement.id == requirement_id)
    res = await db.execute(stmt)
    req: Requirement | None = res.scalars().first()

    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found.")
    if not req.jira_issue_key:
        raise HTTPException(
            status_code=400,
            detail="This requirement is not linked to a Jira issue.",
        )

    client, _ = await get_active_jira_client(db, user_id, workspace_id)

    body = comment_body or _build_auto_comment(req)

    try:
        result = await client.post_comment(req.jira_issue_key, body)
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e

    # AuditLog
    audit = AuditLog(
        user_id=str(user_id),
        action="jira.comment_posted",
        resource_type="requirement",
        resource_id=str(req.id),
    )
    db.add(audit)
    await db.commit()

    return JiraPostCommentResponse(
        success=True,
        issue_key=req.jira_issue_key,
        comment_id=result.get("comment_id"),
        author=result.get("author"),
        message=f"Comment posted to Jira issue {req.jira_issue_key} successfully.",
    )


async def get_or_create_webhook_secret(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
    base_url: str,
    rotate: bool = False,
    custom_secret: str | None = None,
) -> "JiraWebhookSecretResponse":
    """Get the current webhook shared secret or rotate/set custom secret.

    - If custom_secret is provided: updates the secret to the custom value.
    - If rotate is True: generates a new random token_urlsafe(32).
    - Otherwise: preserves and returns the existing webhook secret (or generates one if none exists yet).
    """
    from app.modules.jira.schemas.jira_schemas import JiraWebhookSecretResponse

    integration = await get_jira_integration(db, user_id, workspace_id)
    if not integration:
        raise HTTPException(
            status_code=400,
            detail="No Jira integration configured. Save your Jira connection first.",
        )

    if custom_secret and custom_secret.strip():
        plain_secret = custom_secret.strip()
        integration.webhook_secret = encrypt_secret(plain_secret)
        await db.commit()
        await db.refresh(integration)
        message = "Custom webhook secret saved successfully."
    elif rotate or not integration.webhook_secret:
        plain_secret = _secrets.token_urlsafe(32)
        integration.webhook_secret = encrypt_secret(plain_secret)
        await db.commit()
        await db.refresh(integration)
        message = "Webhook secret regenerated successfully. Please update the Secret in your Jira webhook configuration."
    else:
        plain_secret = decrypt_secret(integration.webhook_secret)
        message = "Active webhook secret retrieved successfully."

    effective_base = resolve_public_backend_url(base_url)
    webhook_url = f"{effective_base}/api/v1/jira/webhook"
    return JiraWebhookSecretResponse(
        webhook_url=webhook_url,
        webhook_secret=plain_secret,
        message=message,
    )


# Backwards compatibility alias
generate_webhook_secret = get_or_create_webhook_secret


async def handle_jira_webhook(
    db: AsyncSession,
    event_type: str,
    issue_data: dict,
    changelog: dict | None,
    actor_user_id: str | None = None,
    integration: JiraIntegration | None = None,
) -> dict:
    """Process an inbound Jira webhook event scoped to the matched integration tenant.

    Supported events:
    - jira:issue_updated / issue_updated — re-sync requirement if relevant fields changed.
    - jira:issue_deleted / issue_deleted — unlink jira_issue_key from requirement.
    """
    issue_key = issue_data.get("key", "")
    if not issue_key:
        logger.warning("Jira webhook: no issue key in payload; skipping.")
        return {"success": False, "reason": "no_issue_key"}

    # Find requirements linked to this Jira issue, scoped to matched tenant if provided
    stmt = select(Requirement).where(Requirement.jira_issue_key == issue_key)
    if integration is not None:
        if integration.workspace_id:
            stmt = stmt.where(Requirement.workspace_id == integration.workspace_id)
        elif integration.user_id:
            stmt = stmt.where(Requirement.user_id == integration.user_id)
    res = await db.execute(stmt)
    requirements: list[Requirement] = list(res.scalars().all())

    if not requirements:
        logger.debug(f"Jira webhook: no TraceIQ requirements linked to {issue_key}; skipping.")
        return {
            "success": True,
            "issue_key": issue_key,
            "matched_requirements": 0,
            "updated": False,
        }

    event_lower = event_type.lower()

    if "deleted" in event_lower:
        # Unlink from TraceIQ requirements
        for req in requirements:
            req.jira_status = "JIRA_DELETED"
            logger.info(f"Jira webhook: issue {issue_key} deleted — marking requirement {req.id}.")
        await db.commit()
        return {
            "success": True,
            "issue_key": issue_key,
            "matched_requirements": len(requirements),
            "updated": True,
            "action": "deleted",
        }

    # For updated/transitioned events — check which fields changed
    changed_fields: set[str] = set()
    if changelog:
        for item in changelog.get("items", []):
            if isinstance(item, dict):
                changed_fields.add(item.get("field", "").lower())

    # Extract updated status, content, and metadata from issue fields
    fields = issue_data.get("fields", {})
    new_status: str | None = None
    new_priority: str | None = None
    new_type: str | None = None
    new_summary: str | None = None
    new_description_md: str | None = None

    if fields:
        status_obj = fields.get("status") or {}
        new_status = status_obj.get("name") if isinstance(status_obj, dict) else None

        priority_obj = fields.get("priority") or {}
        new_priority = priority_obj.get("name") if isinstance(priority_obj, dict) else None

        type_obj = fields.get("issuetype") or {}
        new_type = type_obj.get("name") if isinstance(type_obj, dict) else None

        raw_summary = fields.get("summary")
        if isinstance(raw_summary, str) and raw_summary.strip():
            new_summary = raw_summary.strip()

        if "description" in fields:
            from app.integrations.jira.adf_converter import adf_to_markdown

            converted = adf_to_markdown(fields.get("description")).strip()
            if converted:
                new_description_md = converted

    # If description changed in changelog but wasn't included in webhook payload, fetch fresh via API
    if (
        ("description" in changed_fields or "summary" in changed_fields)
        and new_description_md is None
        and integration is not None
    ):
        try:
            client, _ = await get_active_jira_client(
                db,
                actor_user_id or integration.user_id,
                integration.workspace_id,
            )
            fetched = await client.get_issue(issue_key)
            if fetched.get("summary"):
                new_summary = fetched["summary"]
            if fetched.get("description_markdown"):
                new_description_md = fetched["description_markdown"]
        except Exception as fetch_err:
            logger.debug(f"Webhook fallback fetch for {issue_key} skipped: {fetch_err}")

    drift_detected = False
    now_utc = datetime.now(UTC).replace(tzinfo=None)
    has_explicit_changelog = bool(changelog and changelog.get("items"))

    # Auto-resync each linked requirement (metadata + title/description with new RequirementVersion)
    for req in requirements:
        summary_matches = bool(new_summary and req.title in (new_summary, f"[{issue_key}] {new_summary}"))
        should_sync_title = bool(
            new_summary
            and ("summary" in changed_fields or (not has_explicit_changelog and not summary_matches))
        )
        should_sync_desc = bool(
            new_description_md
            and ("description" in changed_fields or new_description_md != req.text)
        )
        candidate_title = f"[{issue_key}] {new_summary}" if should_sync_title else None
        candidate_text = new_description_md if should_sync_desc else None

        content_updated, was_updated = _apply_jira_issue_update(
            db,
            req,
            new_title=candidate_title,
            new_text=candidate_text,
            new_status=new_status,
            new_priority=new_priority,
            new_type=new_type,
            now_naive=now_utc,
        )

        # Resolve a valid users.id FK for AuditLog entries (never use a dummy string like "system").
        audit_user_id = str(req.user_id) if req.user_id else actor_user_id

        # Log upstream content change as drift while keeping TraceIQ auto-synced
        if "description" in changed_fields or "summary" in changed_fields or content_updated:
            if audit_user_id:
                audit = AuditLog(
                    user_id=audit_user_id,
                    action="jira.drift_detected",
                    resource_type="requirement",
                    resource_id=str(req.id),
                )
                db.add(audit)
            drift_detected = True
            was_updated = True

        if was_updated and audit_user_id:
            audit_update = AuditLog(
                user_id=audit_user_id,
                action="jira.webhook_sync",
                resource_type="requirement",
                resource_id=str(req.id),
            )
            db.add(audit_update)

        logger.info(
            f"Jira webhook: processed {event_type} for {issue_key} "
            f"→ requirement {req.id} (updated={was_updated}, content_resynced={content_updated})"
        )

    await db.commit()

    return {
        "success": True,
        "issue_key": issue_key,
        "matched_requirements": len(requirements),
        "updated": True,
        "new_status": new_status,
        "drift_detected": drift_detected,
    }


async def simulate_jira_webhook_delivery(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
) -> "JiraWebhookTestResponse":
    """Simulate an inbound Jira webhook event to verify end-to-end webhook delivery and processing."""
    from app.modules.jira.schemas.jira_schemas import JiraWebhookTestResponse

    integration = await get_jira_integration(db, user_id, workspace_id)
    if not integration or not integration.webhook_secret:
        raise HTTPException(
            status_code=400,
            detail="Jira webhook secret has not been generated yet. Please generate a secret first.",
        )

    # Look for an existing requirement linked to Jira in this workspace
    stmt = select(Requirement).where(Requirement.jira_issue_key.is_not(None))
    if workspace_id:
        stmt = stmt.where(Requirement.workspace_id == workspace_id)
    else:
        stmt = stmt.where(Requirement.user_id == user_id)

    res = await db.execute(stmt)
    req = res.scalars().first()

    if not req:
        # Fall back to any linked requirement
        res_any = await db.execute(
            select(Requirement).where(Requirement.jira_issue_key.is_not(None))
        )
        req = res_any.scalars().first()

    target_issue_key = req.jira_issue_key if req else "TEST-101"
    old_status = req.jira_status if req else "To Do"
    new_status = "In Progress" if old_status != "In Progress" else "Done"

    simulated_issue_data = {
        "key": target_issue_key,
        "fields": {
            "summary": req.title if req else "Simulated Test Issue",
            "status": {"name": new_status},
        },
    }
    simulated_changelog = {
        "items": [
            {
                "field": "status",
                "fromString": old_status or "To Do",
                "toString": new_status,
            }
        ]
    }

    result = await handle_jira_webhook(
        db=db,
        event_type="jira:issue_updated",
        issue_data=simulated_issue_data,
        changelog=simulated_changelog,
        actor_user_id=user_id,
    )

    try:
        from app.core.cache import cache

        await cache.delete_pattern("ws:*:jira*")
        await cache.delete_pattern("ws:*:requirements*")
        await cache.delete_pattern("user:*:jira*")
        await cache.delete_pattern("user:*:requirements*")
    except Exception:
        pass

    return JiraWebhookTestResponse(
        success=True,
        message=f"Webhook simulated successfully for issue {target_issue_key}. Status transitioned from '{old_status}' to '{new_status}'.",
        issue_key=target_issue_key,
        old_status=old_status,
        new_status=new_status,
        drift_detected=result.get("drift_detected", False),
        matched_requirements=result.get("matched_requirements", 0),
    )

