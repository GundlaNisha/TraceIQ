"""Jira Integration API routes — Bidirectional Sync, Status Transitions, and Webhook Listener."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import build_cache_key, cache, cached
from app.core.config import settings
from app.core.crypto import decrypt_secret
from app.core.deps import get_active_workspace_id, get_current_user
from app.db.session import get_db
from app.integrations.jira.client import JiraApiError
from app.modules.auth.models.user import User
from app.modules.jira.models.jira_integration import JiraIntegration
from app.modules.jira.schemas.jira_schemas import (
    JiraBatchImportRequest,
    JiraBatchImportResponse,
    JiraBoardItem,
    JiraConfigCreate,
    JiraConfigResponse,
    JiraImportRequest,
    JiraImportResult,
    JiraIssueDetailResponse,
    JiraIssueTypeItem,
    JiraOAuthAuthorizeResponse,
    JiraOAuthWebhookSyncResponse,
    JiraPostCommentRequest,
    JiraPostCommentResponse,
    JiraProjectItem,
    JiraSearchResponse,
    JiraSprintItem,
    JiraStatusItem,
    JiraSyncResponse,
    JiraTestConnectionRequest,
    JiraTestConnectionResponse,
    JiraTransitionItem,
    JiraTransitionRequest,
    JiraTransitionResponse,
    JiraSetWebhookSecretRequest,
    JiraWebhookSecretResponse,
    JiraWebhookTestResponse,
)
from app.modules.jira.services.jira_oauth_service import (
    create_oauth_authorization_url,
    ensure_active_dynamic_webhook,
    handle_oauth_callback,
)
from app.modules.jira.services.jira_service import (
    batch_import_jira_issues,
    delete_jira_config,
    generate_webhook_secret,
    get_active_jira_client,
    get_or_create_webhook_secret,
    get_request_base_url,
    get_issue_transitions,
    get_jira_config_response,
    get_jira_integration,
    get_jira_issue_detail,
    handle_jira_webhook,
    import_jira_issue,
    list_jira_boards,
    list_jira_issue_types,
    list_jira_projects,
    list_jira_sprints,
    list_jira_statuses,
    post_jira_comment,
    save_jira_config,
    search_jira_issues,
    sync_jira_requirement,
    test_jira_credentials,
    simulate_jira_webhook_delivery,
    transition_jira_issue,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/jira", tags=["jira"])


def _jira_key_builder(resource: str):
    def builder(*args, **kwargs) -> str:
        current_user = kwargs.get("current_user")
        request = kwargs.get("request")
        workspace_id = kwargs.get("workspace_id")
        target_ws = workspace_id or (get_active_workspace_id(request) if request else None)
        base = f"ws:{target_ws}:jira:{resource}" if target_ws else f"user:{current_user.id}:jira:{resource}"
        filter_kwargs = {
            k: v
            for k, v in kwargs.items()
            if k not in ("db", "session", "request", "current_user", "background_tasks", "workspace_id")
            and v is not None
        }
        return build_cache_key(base, **filter_kwargs)

    return builder


# ---------------------------------------------------------------------------
# Phase 1: Configuration
# ---------------------------------------------------------------------------


@router.get("/config", response_model=JiraConfigResponse)
async def get_config(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve current Jira integration status and configuration (without exposing API token)."""
    target_ws = workspace_id or get_active_workspace_id(request)
    base_url = get_request_base_url(request)
    return await get_jira_config_response(db, current_user.id, target_ws, base_url=base_url)


@router.post("/config", response_model=JiraConfigResponse)
async def save_config(
    body: JiraConfigCreate,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify credentials with Jira and save Jira integration configuration."""
    target_ws = workspace_id or get_active_workspace_id(request)
    base_url = get_request_base_url(request)
    res = await save_jira_config(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        domain=body.jira_domain,
        email=body.jira_email,
        api_token=body.jira_api_token,
        default_project_key=body.default_project_key,
        webhook_secret=body.webhook_secret,
        base_url=base_url,
    )
    if target_ws:
        await cache.invalidate_workspace(target_ws, "jira")
    else:
        await cache.invalidate_user(current_user.id, "jira")
    return res


@router.delete("/config", status_code=status.HTTP_204_NO_CONTENT)
async def remove_config(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect and remove saved Jira configuration."""
    target_ws = workspace_id or get_active_workspace_id(request)
    await delete_jira_config(db, current_user.id, target_ws)
    if target_ws:
        await cache.invalidate_workspace(target_ws, "jira")
    else:
        await cache.invalidate_user(current_user.id, "jira")


@router.post("/test-connection", response_model=JiraTestConnectionResponse)
async def test_connection(
    body: JiraTestConnectionRequest,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Test Jira credentials on-the-fly or test current saved configuration."""
    if body.jira_domain and body.jira_email and body.jira_api_token:
        return await test_jira_credentials(
            domain=body.jira_domain,
            email=body.jira_email,
            api_token=body.jira_api_token,
        )

    target_ws = workspace_id or get_active_workspace_id(request)
    try:
        client, integration = await get_active_jira_client(
            db, current_user.id, target_ws, public_base_url=get_request_base_url(request)
        )
        profile = await client.test_connection()
        return JiraTestConnectionResponse(
            success=True,
            account_id=profile.get("account_id"),
            display_name=profile.get("display_name"),
            email_address=profile.get("email_address"),
            jira_url=profile.get("jira_url"),
            message=f"Successfully connected to Jira ({integration.auth_type}) as {profile.get('display_name') or integration.jira_email}.",
        )
    except JiraApiError as exc:
        return JiraTestConnectionResponse(success=False, message=exc.message)
    except Exception:
        return JiraTestConnectionResponse(
            success=False,
            message="No valid Jira integration configured. Please connect via OAuth 2.0 or supply credentials.",
        )


# ---------------------------------------------------------------------------
# Phase 1: Browse Jira Metadata
# ---------------------------------------------------------------------------


@router.get("/projects", response_model=list[JiraProjectItem])
@cached(ttl=600, key_builder=_jira_key_builder("projects"))
async def get_projects(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List accessible projects from the connected Jira instance."""
    target_ws = workspace_id or get_active_workspace_id(request)
    return await list_jira_projects(db, current_user.id, target_ws)


@router.get("/issue-types", response_model=list[JiraIssueTypeItem])
@cached(ttl=600, key_builder=_jira_key_builder("issue_types"))
async def get_issue_types(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all configured issue types (Stories, Tasks, To-Dos, Bugs, Epics, Sub-tasks)."""
    target_ws = workspace_id or get_active_workspace_id(request)
    return await list_jira_issue_types(db, current_user.id, target_ws)


@router.get("/statuses", response_model=list[JiraStatusItem])
@cached(ttl=600, key_builder=_jira_key_builder("statuses"))
async def get_statuses(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List workflow statuses (To Do, In Progress, Backlog, Done, etc.)."""
    target_ws = workspace_id or get_active_workspace_id(request)
    return await list_jira_statuses(db, current_user.id, target_ws)


@router.get("/boards", response_model=list[JiraBoardItem])
@cached(ttl=600, key_builder=_jira_key_builder("boards"))
async def get_boards(
    request: Request,
    project_key: str | None = Query(None, description="Optional project key filter"),
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all Kanban and Scrum boards."""
    target_ws = workspace_id or get_active_workspace_id(request)
    return await list_jira_boards(db, current_user.id, target_ws, project_key=project_key)


@router.get("/boards/{board_id}/sprints", response_model=list[JiraSprintItem])
@cached(ttl=300, key_builder=_jira_key_builder("sprints"))
async def get_board_sprints(
    board_id: int,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List sprints for a Scrum board."""
    target_ws = workspace_id or get_active_workspace_id(request)
    return await list_jira_sprints(db, current_user.id, board_id=board_id, workspace_id=target_ws)


# ---------------------------------------------------------------------------
# Phase 1: Issue Search + Detail
# ---------------------------------------------------------------------------


@router.get("/issues", response_model=JiraSearchResponse)
@cached(ttl=180, key_builder=_jira_key_builder("issues"))
async def search_issues(
    request: Request,
    q: str = Query("", description="Search term for key or summary"),
    project_key: str | None = Query(None, description="Optional project key filter"),
    issue_type: str | None = Query(None, description="Optional issue type filter (e.g. Story, Bug, To Do, Task)"),
    status: str | None = Query(None, description="Optional status filter (e.g. To Do, In Progress, Done)"),
    status_category: str | None = Query(None, description="Optional status category filter"),
    board_id: int | None = Query(None, description="Optional Kanban or Scrum board ID filter"),
    sprint_id: int | None = Query(None, description="Optional sprint ID filter"),
    jql: str = Query("", description="Custom JQL override"),
    start_at: int = Query(0, ge=0),
    max_results: int = Query(25, ge=1, le=100),
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search and browse issues from the connected Jira instance."""
    target_ws = workspace_id or get_active_workspace_id(request)
    return await search_jira_issues(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        query=q,
        project_key=project_key,
        issue_type=issue_type,
        status=status,
        status_category=status_category,
        board_id=board_id,
        sprint_id=sprint_id,
        jql=jql,
        start_at=start_at,
        max_results=max_results,
    )


@router.get("/issues/{issue_key}/transitions", response_model=list[JiraTransitionItem])
async def get_transitions(
    issue_key: str,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List available workflow transitions for a Jira issue.

    Use the returned transition IDs to change the issue's status via
    POST /requirements/{req_id}/transition.
    """
    target_ws = workspace_id or get_active_workspace_id(request)
    return await get_issue_transitions(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        issue_key=issue_key,
    )


@router.get("/issues/{issue_key}", response_model=JiraIssueDetailResponse)
@cached(ttl=180, key_builder=_jira_key_builder("detail"))
async def get_issue_detail(
    issue_key: str,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full details and markdown-converted description for a single Jira issue."""
    target_ws = workspace_id or get_active_workspace_id(request)
    return await get_jira_issue_detail(
        db=db,
        user_id=current_user.id,
        issue_key=issue_key,
        workspace_id=target_ws,
    )


# ---------------------------------------------------------------------------
# Phase 1: Import
# ---------------------------------------------------------------------------


@router.post("/import", response_model=JiraImportResult, status_code=status.HTTP_201_CREATED)
async def import_single_issue(
    body: JiraImportRequest,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import a Jira issue as a requirement linked to a repository."""
    target_ws = workspace_id or get_active_workspace_id(request)
    res = await import_jira_issue(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        repo_id=body.repository_id,
        issue_key=body.issue_key,
        custom_title=body.custom_title,
        custom_text=body.custom_text,
    )
    if target_ws:
        await cache.invalidate_workspace(target_ws, "requirements")
        await cache.invalidate_workspace(target_ws, "summary")
    else:
        await cache.invalidate_user(current_user.id, "requirements")
    return res


@router.post("/import-batch", response_model=JiraBatchImportResponse, status_code=status.HTTP_201_CREATED)
async def import_batch_issues(
    body: JiraBatchImportRequest,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import multiple Jira issues in batch."""
    target_ws = workspace_id or get_active_workspace_id(request)
    res = await batch_import_jira_issues(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        repo_id=body.repository_id,
        issue_keys=body.issue_keys,
    )
    if target_ws:
        await cache.invalidate_workspace(target_ws, "requirements")
        await cache.invalidate_workspace(target_ws, "summary")
    else:
        await cache.invalidate_user(current_user.id, "requirements")
    return res


# ---------------------------------------------------------------------------
# Phase 1 + 2: Requirement-linked operations
# ---------------------------------------------------------------------------


@router.post("/requirements/{req_id}/sync", response_model=JiraSyncResponse)
async def sync_requirement(
    req_id: uuid.UUID,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch updated content from Jira and sync with the TraceIQ requirement."""
    target_ws = workspace_id or get_active_workspace_id(request)
    res = await sync_jira_requirement(
        db=db,
        user_id=current_user.id,
        requirement_id=req_id,
        workspace_id=target_ws,
    )
    if target_ws:
        await cache.invalidate_workspace(target_ws, "jira")
        await cache.invalidate_workspace(target_ws, "requirements")
    else:
        await cache.invalidate_user(current_user.id, "jira")
        await cache.invalidate_user(current_user.id, "requirements")
    return res


@router.post("/requirements/{req_id}/transition", response_model=JiraTransitionResponse)
async def transition_requirement_issue(
    req_id: uuid.UUID,
    body: JiraTransitionRequest,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transition the linked Jira issue status directly from TraceIQ.

    Obtain transition IDs from GET /issues/{key}/transitions.
    Optionally post a confirmation comment to Jira after transitioning.
    """
    target_ws = workspace_id or get_active_workspace_id(request)
    res = await transition_jira_issue(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        requirement_id=req_id,
        transition_id=body.transition_id,
        post_comment_flag=body.post_comment,
        comment_text=body.comment,
    )
    if target_ws:
        await cache.invalidate_workspace(target_ws, "jira")
        await cache.invalidate_workspace(target_ws, "requirements")
    else:
        await cache.invalidate_user(current_user.id, "jira")
        await cache.invalidate_user(current_user.id, "requirements")
    return res


@router.post("/requirements/{req_id}/post-comment", response_model=JiraPostCommentResponse)
async def post_comment_to_jira(
    req_id: uuid.UUID,
    body: JiraPostCommentRequest,
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Post a TraceIQ impact analysis summary (or custom text) as a comment to the linked Jira issue.

    If comment_body is omitted, an auto-generated TraceIQ summary is posted.
    """
    target_ws = workspace_id or get_active_workspace_id(request)
    return await post_jira_comment(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        requirement_id=req_id,
        comment_body=body.comment_body,
    )


# ---------------------------------------------------------------------------
# Phase 2: Webhook Configuration
# ---------------------------------------------------------------------------


@router.get("/config/webhook-secret", response_model=JiraWebhookSecretResponse)
async def get_webhook_secret_endpoint(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the current active webhook secret and URL without rotating it."""
    target_ws = workspace_id or get_active_workspace_id(request)
    base_url = get_request_base_url(request)
    return await get_or_create_webhook_secret(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        base_url=base_url,
        rotate=False,
    )


@router.post("/config/webhook-secret", response_model=JiraWebhookSecretResponse)
async def rotate_or_set_webhook_secret(
    request: Request,
    body: JiraSetWebhookSecretRequest | None = None,
    rotate: bool = Query(False, description="Set to true to rotate secret"),
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get, rotate, or set custom Jira webhook shared secret for this workspace.

    - If body.custom_secret is provided: updates the secret to that value.
    - If rotate is True or body.rotate is True: regenerates a new random secret.
    - If neither is provided: returns the existing active secret safely without modifying it.
    """
    target_ws = workspace_id or get_active_workspace_id(request)
    base_url = get_request_base_url(request)
    should_rotate = rotate or (body.rotate if body else False)
    custom_sec = body.custom_secret if body else None

    return await get_or_create_webhook_secret(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        base_url=base_url,
        rotate=should_rotate,
        custom_secret=custom_sec,
    )


# ---------------------------------------------------------------------------
# Phase 2B: Atlassian OAuth 2.0 (3LO) + Auto-Registered Webhooks
# ---------------------------------------------------------------------------


@router.post("/oauth/authorize", response_model=JiraOAuthAuthorizeResponse)
async def start_jira_oauth(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a single-use CSRF-protected Atlassian OAuth 2.0 authorization URL."""
    target_ws = workspace_id or get_active_workspace_id(request)
    base_url = get_request_base_url(request)
    origin = request.headers.get("origin") or settings.frontend_url or "http://localhost:3000"
    auth_url = await create_oauth_authorization_url(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        request_base_url=base_url,
        frontend_origin=origin,
    )
    return JiraOAuthAuthorizeResponse(authorization_url=auth_url)


@router.get("/oauth/callback", include_in_schema=False)
async def jira_oauth_callback(
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    error_description: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Atlassian OAuth 2.0 (3LO) callback handler. Never exposes secrets to browser."""
    fallback_frontend = (settings.frontend_url or "http://localhost:3000").rstrip("/")

    if error:
        if state:
            state_data = await cache.pop(f"jira:oauth:state:{state}")
            if isinstance(state_data, dict) and state_data.get("frontend_origin"):
                fallback_frontend = state_data["frontend_origin"].rstrip("/")
        safe_msg = quote(error_description or error)
        return RedirectResponse(url=f"{fallback_frontend}/requirements?jira_error={safe_msg}", status_code=302)

    if not code or not state:
        msg = quote("Missing OAuth authorization code or state.")
        return RedirectResponse(url=f"{fallback_frontend}/requirements?jira_error={msg}", status_code=302)

    try:
        redirect_target, _ = await handle_oauth_callback(db=db, code=code, state=state)
        return RedirectResponse(url=redirect_target, status_code=302)
    except Exception as exc:
        logger.warning(f"Jira OAuth callback failed cleanly: {getattr(exc, 'detail', exc)}")
        detail = getattr(exc, "detail", None) or "Jira OAuth authorization failed. Please try again."
        return RedirectResponse(
            url=f"{fallback_frontend}/requirements?jira_error={quote(str(detail))}",
            status_code=302,
        )


@router.post("/oauth/webhook/sync", response_model=JiraOAuthWebhookSyncResponse)
async def sync_oauth_dynamic_webhook(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    force: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register or refresh the auto-managed Jira Cloud webhook for an OAuth 2.0 connection."""
    target_ws = workspace_id or get_active_workspace_id(request)
    base_url = get_request_base_url(request)
    client, integration = await get_active_jira_client(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        public_base_url=base_url,
    )
    if integration.auth_type != "oauth2":
        return JiraOAuthWebhookSyncResponse(
            success=False,
            webhook_status=integration.webhook_status,
            webhook_expires_at=integration.webhook_expires_at,
            message="Auto-webhook registration requires an OAuth 2.0 Jira connection.",
        )

    await ensure_active_dynamic_webhook(
        db=db,
        client=client,
        integration=integration,
        public_base_url=base_url,
        force_reregister=force,
    )
    if target_ws:
        await cache.invalidate_workspace(target_ws, "jira")
    else:
        await cache.invalidate_user(current_user.id, "jira")

    if integration.webhook_status == "active":
        msg = "Live Jira Cloud webhook registered and active."
    elif integration.webhook_status == "skipped_localhost":
        msg = "Skipped: Jira Cloud requires a public HTTPS URL (set PUBLIC_BACKEND_URL or use ngrok)."
    else:
        msg = "Could not register dynamic webhook with Jira Cloud. Check app manage:jira-webhook scope."

    return JiraOAuthWebhookSyncResponse(
        success=integration.webhook_status == "active",
        webhook_status=integration.webhook_status,
        webhook_expires_at=integration.webhook_expires_at,
        message=msg,
    )


async def _dispatch_webhook_background(
    event_type: str,
    issue_data: dict,
    changelog: dict | None,
    actor_user_id: str | None = None,
    integration_id: uuid.UUID | None = None,
) -> None:
    """Run webhook event handler in background with an isolated database session."""
    from app.db.session import AsyncSessionLocal
    from app.modules.jira.services.jira_service import handle_jira_webhook

    async with AsyncSessionLocal() as session:
        try:
            matched_integ = (
                await session.get(JiraIntegration, integration_id)
                if integration_id is not None
                else None
            )
            await handle_jira_webhook(
                db=session,
                event_type=event_type,
                issue_data=issue_data,
                changelog=changelog,
                actor_user_id=actor_user_id,
                integration=matched_integ,
            )
            try:
                # Invalidate general Jira and requirement caches
                await cache.delete_pattern("ws:*:jira*")
                await cache.delete_pattern("ws:*:requirements*")
                await cache.delete_pattern("user:*:jira*")
                await cache.delete_pattern("user:*:requirements*")
            except Exception:
                pass
        except Exception as exc:
            logger.exception(f"Error in background Jira webhook execution: {exc}")


@router.post("/webhook/test", response_model=JiraWebhookTestResponse)
async def test_webhook_simulation(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Simulate a Jira webhook issue update event to verify webhook delivery and drift detection."""
    target_ws = workspace_id or get_active_workspace_id(request)
    return await simulate_jira_webhook_delivery(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
    )


@router.post("/webhook", status_code=200, include_in_schema=False)
async def jira_webhook_listener(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Receive inbound Jira webhook events.

    Security & Verification:
    - Jira Cloud HMAC-SHA256 signature in X-Hub-Signature or X-Hub-Signature-256 (sha256=<hex>)
    - X-Atlassian-Webhook-Secret or Authorization: Bearer <secret> header
    - ?secret=<secret> query parameter
    Always returns HTTP 200 — Jira disables webhooks that return 4xx/5xx responses repeatedly.
    """
    try:
        body_bytes = await request.body()

        # 1. Query parameter secret (?secret=...)
        secret_param = request.query_params.get("secret")

        # 2. Header-based plain secret
        header_secret = (
            request.headers.get("X-Atlassian-Webhook-Secret")
            or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        )

        # 3. HMAC-SHA256 signature header from Jira Cloud
        sig_header = (
            request.headers.get("X-Hub-Signature")
            or request.headers.get("X-Hub-Signature-256")
            or request.headers.get("X-Atlassian-Webhook-Signature")
        )

        # Fetch active integrations with a configured webhook secret
        stmt = select(JiraIntegration).where(
            JiraIntegration.webhook_secret.is_not(None),
            JiraIntegration.is_active.is_(True),
        )
        res = await db.execute(stmt)
        active_integrations = list(res.scalars().all())

        matching_integration: JiraIntegration | None = None
        for integ in active_integrations:
            secret = decrypt_secret(integ.webhook_secret)
            if not secret:
                continue

            # Check query param
            if secret_param and hmac.compare_digest(secret, secret_param):
                matching_integration = integ
                break

            # Check plain header
            if header_secret and hmac.compare_digest(secret, header_secret):
                matching_integration = integ
                break

            # Check HMAC-SHA256 signature
            if sig_header:
                computed_hash = hmac.new(
                    secret.encode("utf-8"),
                    body_bytes,
                    hashlib.sha256,
                ).hexdigest()
                cleaned_sig = sig_header.strip()
                if (
                    hmac.compare_digest(f"sha256={computed_hash}", cleaned_sig)
                    or hmac.compare_digest(computed_hash, cleaned_sig.removeprefix("sha256="))
                ):
                    matching_integration = integ
                    break

        if not matching_integration:
            logger.warning(
                "Jira webhook: secret or HMAC signature validation failed (or no matching active integration); ignoring."
            )
            return {"ok": True, "status": "unauthorized_or_unknown_secret"}

        try:
            payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            logger.warning("Jira webhook: failed to parse JSON body.")
            return {"ok": True, "status": "invalid_json"}

        event_type: str = payload.get("webhookEvent") or payload.get("issue_event_type_name") or ""
        issue_data: dict = payload.get("issue") or {}
        changelog: dict | None = payload.get("changelog")

        if not event_type or not issue_data:
            logger.debug(f"Jira webhook: skipping event '{event_type}' — missing issue data.")
            return {"ok": True, "status": "skipped_no_issue"}

        logger.info(
            f"Jira webhook verified for issue {issue_data.get('key')} "
            f"(event={event_type}). Dispatching background task."
        )

        # Dispatch processing in background using an isolated session scoped to the matched integration
        background_tasks.add_task(
            _dispatch_webhook_background,
            event_type,
            issue_data,
            changelog,
            matching_integration.user_id,
            matching_integration.id,
        )

    except Exception as exc:
        # Catch-all: never propagate errors to Jira
        logger.exception(f"Jira webhook: unexpected error — {exc}")

    return {"ok": True}

