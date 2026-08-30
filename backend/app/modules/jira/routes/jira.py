"""Jira Integration API routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_active_workspace_id, get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
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
    JiraProjectItem,
    JiraSearchResponse,
    JiraSprintItem,
    JiraStatusItem,
    JiraSyncResponse,
    JiraTestConnectionRequest,
    JiraTestConnectionResponse,
)
from app.modules.jira.services.jira_service import (
    batch_import_jira_issues,
    delete_jira_config,
    get_jira_config_response,
    get_jira_issue_detail,
    import_jira_issue,
    list_jira_boards,
    list_jira_issue_types,
    list_jira_projects,
    list_jira_sprints,
    list_jira_statuses,
    save_jira_config,
    search_jira_issues,
    sync_jira_requirement,
    test_jira_credentials,
)

router = APIRouter(prefix="/api/v1/jira", tags=["jira"])


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

    # Test with saved configuration
    target_ws = workspace_id or get_active_workspace_id(request)
    from app.modules.jira.services.jira_service import get_jira_integration

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
