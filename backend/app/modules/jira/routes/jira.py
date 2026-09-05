"""Jira Integration API routes — Bidirectional Sync, Status Transitions, and Webhook Listener."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_active_workspace_id, get_current_user
from app.db.session import get_db
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
    JiraWebhookSecretResponse,
    JiraWebhookTestResponse,
)
from app.modules.jira.services.jira_service import (
    batch_import_jira_issues,
    delete_jira_config,
    generate_webhook_secret,
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
    return await get_jira_config_response(db, current_user.id, target_ws)


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
    return await save_jira_config(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        domain=body.jira_domain,
        email=body.jira_email,
        api_token=body.jira_api_token,
        default_project_key=body.default_project_key,
    )


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
    integration = await get_jira_integration(db, current_user.id, target_ws)
    if not integration:
        return JiraTestConnectionResponse(
            success=False,
            message="No Jira integration configured. Please supply domain, email, and API token.",
        )

    return await test_jira_credentials(
        domain=integration.jira_domain,
        email=integration.jira_email,
        api_token=integration.jira_api_token,
    )


# ---------------------------------------------------------------------------
# Phase 1: Browse Jira Metadata
# ---------------------------------------------------------------------------


@router.get("/projects", response_model=list[JiraProjectItem])
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
    return await import_jira_issue(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        repo_id=body.repository_id,
        issue_key=body.issue_key,
        custom_title=body.custom_title,
        custom_text=body.custom_text,
    )


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
    return await batch_import_jira_issues(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        repo_id=body.repository_id,
        issue_keys=body.issue_keys,
    )


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
    return await sync_jira_requirement(
        db=db,
        user_id=current_user.id,
        requirement_id=req_id,
        workspace_id=target_ws,
    )


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
    return await transition_jira_issue(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        requirement_id=req_id,
        transition_id=body.transition_id,
        post_comment_flag=body.post_comment,
        comment_text=body.comment,
    )


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


@router.post("/config/webhook-secret", response_model=JiraWebhookSecretResponse)
async def rotate_webhook_secret(
    request: Request,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate or rotate the Jira webhook shared secret for this workspace.

    The secret is returned ONCE in plain text — copy it into the
    'Secret' field of your Jira Webhook configuration.
    The webhook endpoint URL is also included for convenience.
    """
    target_ws = workspace_id or get_active_workspace_id(request)
    base_url = str(request.base_url)
    return await generate_webhook_secret(
        db=db,
        user_id=current_user.id,
        workspace_id=target_ws,
        base_url=base_url,
    )


async def _dispatch_webhook_background(
    event_type: str,
    issue_data: dict,
    changelog: dict | None,
) -> None:
    """Run webhook event handler in background with an isolated database session."""
    from app.db.session import AsyncSessionLocal
    from app.modules.jira.services.jira_service import handle_jira_webhook

    async with AsyncSessionLocal() as session:
        try:
            await handle_jira_webhook(
                db=session,
                event_type=event_type,
                issue_data=issue_data,
                changelog=changelog,
            )
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
            secret = integ.webhook_secret
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

        event_type: str = payload.get("webhookEvent", "")
        issue_data: dict = payload.get("issue") or {}
        changelog: dict | None = payload.get("changelog")

        if not event_type or not issue_data:
            logger.debug(f"Jira webhook: skipping event '{event_type}' — missing issue data.")
            return {"ok": True, "status": "skipped_no_issue"}

        logger.info(
            f"Jira webhook verified for issue {issue_data.get('key')} "
            f"(event={event_type}). Dispatching background task."
        )

        # Dispatch processing in background using an isolated session
        background_tasks.add_task(
            _dispatch_webhook_background,
            event_type,
            issue_data,
            changelog,
        )

    except Exception as exc:
        # Catch-all: never propagate errors to Jira
        logger.exception(f"Jira webhook: unexpected error — {exc}")

    return {"ok": True}

