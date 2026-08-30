"""Jira Integration business logic and service methods."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.jira.client import JiraApiError, JiraClient, normalize_jira_url
from app.modules.audit.models.audit import AuditLog
from app.modules.jira.models.jira_integration import JiraIntegration
from app.modules.jira.schemas.jira_schemas import (
    JiraBatchImportResponse,
    JiraBoardItem,
    JiraConfigResponse,
    JiraImportResult,
    JiraIssueDetailResponse,
    JiraIssueTypeItem,
    JiraProjectItem,
    JiraSearchResponse,
    JiraSprintItem,
    JiraStatusItem,
    JiraSyncResponse,
    JiraTestConnectionResponse,
)
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement, RequirementVersion
from app.modules.requirement.services.req_service import create_requirement
from app.modules.workspace.models.workspace import WorkspaceMember, WorkspaceRole

logger = logging.getLogger(__name__)


def mask_token(token: str) -> str:
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
) -> tuple[JiraClient, JiraIntegration]:
    """Retrieve active JiraIntegration and instantiate a configured JiraClient."""
    integration = await get_jira_integration(db, user_id, workspace_id)
    if not integration or not integration.is_active:
        raise HTTPException(
            status_code=400,
            detail="Jira is not configured for this workspace. Please configure your Jira connection in workspace settings.",
        )

    client = JiraClient(
        domain=integration.jira_domain,
        email=integration.jira_email,
        api_token=integration.jira_api_token,
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
) -> JiraConfigResponse:
    """Get current Jira configuration details without exposing the raw API token."""
    integration = await get_jira_integration(db, user_id, workspace_id)
    if not integration:
        return JiraConfigResponse(
            id=None,
            workspace_id=workspace_id,
            jira_domain="",
            jira_email="",
            default_project_key=None,
            is_active=False,
            is_configured=False,
            token_preview="",
            created_at=None,
            updated_at=None,
        )

    return JiraConfigResponse(
        id=integration.id,
        workspace_id=integration.workspace_id,
        jira_domain=integration.jira_domain,
        jira_email=integration.jira_email,
        default_project_key=integration.default_project_key,
        is_active=integration.is_active,
        is_configured=True,
        token_preview=mask_token(integration.jira_api_token),
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
) -> JiraConfigResponse:
    """Verify credentials and save or update Jira integration."""
    norm_domain = normalize_jira_url(domain)

    # Validate credentials before saving
    test_res = await test_jira_credentials(norm_domain, email, api_token)
    if not test_res.success:
        raise HTTPException(status_code=400, detail=f"Jira verification failed: {test_res.message}")

    # Check if integration already exists for this workspace / user
    integration = await get_jira_integration(db, user_id, workspace_id)
    if integration:
        integration.jira_domain = norm_domain
        integration.jira_email = email.strip()
        integration.jira_api_token = api_token.strip()
        integration.default_project_key = default_project_key.strip() if default_project_key else None
        integration.is_active = True
    else:
        integration = JiraIntegration(
            workspace_id=workspace_id,
            user_id=user_id,
            jira_domain=norm_domain,
            jira_email=email.strip(),
            jira_api_token=api_token.strip(),
            default_project_key=default_project_key.strip() if default_project_key else None,
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

    return await get_jira_config_response(db, user_id, workspace_id)


async def delete_jira_config(
    db: AsyncSession,
    user_id: str,
    workspace_id: uuid.UUID | None,
) -> None:
    """Remove active Jira integration for workspace or user."""
    integration = await get_jira_integration(db, user_id, workspace_id)
    if integration:
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
    # Verify repository access
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    client, _ = await get_active_jira_client(db, user_id, workspace_id)
    try:
        issue = await client.get_issue(issue_key)
    except JiraApiError as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to fetch Jira issue {issue_key}: {e.message}")

    final_title = (custom_title or f"[{issue['key']}] {issue['summary']}").strip()
    final_text = (custom_text or issue['description_markdown']).strip()
    if not final_text:
        final_text = f"Requirement imported from Jira issue [{issue['key']}]({issue['url']}): {issue['summary']}"

    req = await create_requirement(
        db=db,
        user_id=user_id,
        repository_id=repo_id,
        title=final_title,
        text=final_text,
        workspace_id=repo.workspace_id or workspace_id,
        jira_issue_key=issue["key"],
        jira_issue_id=issue["id"],
        jira_issue_url=issue["url"],
        jira_status=issue["status"],
        jira_priority=issue["priority"],
        jira_issue_type=issue["issue_type"],
        jira_synced_at=datetime.now(UTC),
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
            final_title = f"[{issue['key']}] {issue['summary']}".strip()
            final_text = issue['description_markdown'].strip()
            if not final_text:
                final_text = f"Requirement imported from Jira issue [{issue['key']}]({issue['url']}): {issue['summary']}"

            req = await create_requirement(
                db=db,
                user_id=user_id,
                repository_id=repo_id,
                title=final_title,
                text=final_text,
                workspace_id=repo.workspace_id or workspace_id,
                jira_issue_key=issue["key"],
                jira_issue_id=issue["id"],
                jira_issue_url=issue["url"],
                jira_status=issue["status"],
                jira_priority=issue["priority"],
                jira_issue_type=issue["issue_type"],
                jira_synced_at=datetime.now(UTC),
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
    jira_text = issue['description_markdown'].strip()
    jira_status = issue.get("status")
    jira_priority = issue.get("priority")
    jira_type = issue.get("issue_type")

    # Check if anything changed
    has_text_or_title_changed = (req.text != jira_text) or (req.title != jira_title)
    has_status_changed = (req.jira_status != jira_status) or (req.jira_priority != jira_priority)

    req.jira_status = jira_status
    req.jira_priority = jira_priority
    req.jira_issue_type = jira_type
    req.jira_synced_at = datetime.now(UTC)

    was_updated = False
    if has_text_or_title_changed:
        req.title = jira_title
        req.text = jira_text
        req.version_number += 1

        new_version = RequirementVersion(
            requirement_id=req.id,
            version_number=req.version_number,
            title=jira_title,
            text=jira_text,
        )
        db.add(new_version)
        was_updated = True

    audit = AuditLog(
        user_id=str(user_id),
        action="requirement.jira_sync",
        resource_type="requirement",
        resource_id=str(req.id),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(req)

    msg = "Requirement successfully updated with latest Jira changes." if was_updated else "Requirement is already up-to-date with Jira."
    return JiraSyncResponse(
        requirement_id=req.id,
        title=req.title,
        version_number=req.version_number,
        jira_issue_key=req.jira_issue_key,
        jira_status=req.jira_status,
        was_updated=was_updated,
        message=msg,
    )
