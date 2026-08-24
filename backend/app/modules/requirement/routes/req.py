import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_active_workspace_id, get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement, RequirementVersion
from app.modules.requirement.schemas.req_schemas import (
    ReqCreate,
    ReqResponse,
    ReqUpdate,
    VersionResponse,
)
from app.modules.requirement.services.req_service import (
    create_requirement,
    update_requirement,
)
from app.modules.workspace.models.workspace import WorkspaceMember, WorkspaceRole

router = APIRouter(prefix="/api/v1/requirements", tags=["requirements"])


from app.modules.workspace.models.workspace import Workspace, WorkspaceMember, WorkspaceRole


@router.get("", response_model=list[ReqResponse])
async def list_requirements(
    request: Request,
    repo_id: uuid.UUID | None = None,
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_ws = workspace_id or get_active_workspace_id(request)

    base_query = (
        select(
            Requirement,
            Repository.name.label("repository_name"),
            Workspace.name.label("workspace_name"),
        )
        .join(Repository, Requirement.repository_id == Repository.id)
        .outerjoin(Workspace, Requirement.workspace_id == Workspace.id)
    )

    if target_ws:
        # Check membership in active workspace
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == target_ws,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not a member of this workspace")

        stmt = base_query.where(Requirement.workspace_id == target_ws)
        if repo_id:
            stmt = stmt.where(Requirement.repository_id == repo_id)
        stmt = stmt.order_by(Requirement.updated_at.desc())
        result = await db.execute(stmt)
    elif repo_id:
        repo = await db.get(Repository, repo_id)
        if not repo:
            return []
        is_owner = repo.user_id == current_user.id
        if not is_owner and repo.workspace_id:
            mem_res = await db.execute(
                select(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == repo.workspace_id,
                    WorkspaceMember.user_id == current_user.id,
                )
            )
            if not mem_res.scalar_one_or_none():
                return []
        elif not is_owner:
            return []

        stmt = base_query.where(Requirement.repository_id == repo_id).order_by(Requirement.updated_at.desc())
        result = await db.execute(stmt)
    else:
        # Personal workspace / all accessible requirements
        user_ws_subq = select(WorkspaceMember.workspace_id).where(
            WorkspaceMember.user_id == current_user.id
        )
        stmt = base_query.where(
            (Requirement.user_id == current_user.id)
            | (Requirement.workspace_id.in_(user_ws_subq))
        ).order_by(Requirement.updated_at.desc())
        result = await db.execute(stmt)

    rows = result.all()
    reqs = []
    for req_obj, repo_name, ws_name in rows:
        reqs.append(
            ReqResponse(
                id=req_obj.id,
                title=req_obj.title,
                text=req_obj.text,
                user_id=req_obj.user_id,
                repository_id=req_obj.repository_id,
                version_number=req_obj.version_number,
                workspace_id=req_obj.workspace_id,
                created_at=req_obj.created_at,
                updated_at=req_obj.updated_at,
                repository_name=repo_name,
                workspace_name=ws_name,
            )
        )
    return reqs


@router.post("", response_model=ReqResponse, status_code=201)
async def add_requirement(
    body: ReqCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        repo_uuid = uuid.UUID(body.repository_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Verify authorization
    is_owner = repo.user_id == current_user.id
    if not is_owner and repo.workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == repo.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        mem = mem_res.scalar_one_or_none()
        if not mem:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to create requirements for this repository",
            )
        if mem.role == WorkspaceRole.viewer:
            raise HTTPException(
                status_code=403,
                detail="Viewers have read-only access and cannot create requirements",
            )
    elif not is_owner:
        raise HTTPException(
            status_code=403, detail="Forbidden: Repo not owned by user"
        )

    return await create_requirement(
        db,
        current_user.id,
        repo_uuid,
        body.title,
        body.text,
        workspace_id=repo.workspace_id,
    )


@router.get("/{req_id}", response_model=ReqResponse)
async def get_requirement(
    req_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid req UUID")

    req = await db.get(Requirement, req_uuid)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    is_owner = req.user_id == current_user.id
    if not is_owner and req.workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == req.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to view this requirement")
    elif not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to view this requirement")

    return req


@router.patch("/{req_id}", response_model=ReqResponse)
async def patch_requirement(
    req_id: str,
    body: ReqUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid req UUID")

    req = await db.get(Requirement, req_uuid)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    is_owner = req.user_id == current_user.id
    if not is_owner and req.workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == req.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        mem = mem_res.scalar_one_or_none()
        if not mem or mem.role == WorkspaceRole.viewer:
            raise HTTPException(status_code=403, detail="Viewers cannot edit requirements")
    elif not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to edit this requirement")

    return await update_requirement(db, req, body.title, body.text)


@router.delete("/{req_id}", status_code=204)
async def delete_requirement(
    req_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid req UUID")

    req = await db.get(Requirement, req_uuid)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    is_owner = req.user_id == current_user.id
    if not is_owner and req.workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == req.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        mem = mem_res.scalar_one_or_none()
        if not mem or mem.role not in (WorkspaceRole.owner, WorkspaceRole.admin):
            raise HTTPException(status_code=403, detail="Only workspace admins/owners can delete shared requirements")
    elif not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to delete this requirement")

    from sqlalchemy import delete

    from app.modules.impact.models.impact import AnalysisJob, ImpactResult
    from app.modules.pr.models.draft import PRDraft

    # Cascade to ImpactResult first
    subq = select(AnalysisJob.id).where(AnalysisJob.requirement_id == req_uuid)
    await db.execute(delete(ImpactResult).where(ImpactResult.job_id.in_(subq)))

    # Then delete dependent tables
    await db.execute(delete(AnalysisJob).where(AnalysisJob.requirement_id == req_uuid))
    await db.execute(delete(PRDraft).where(PRDraft.requirement_id == req_uuid))
    await db.execute(
        delete(RequirementVersion).where(RequirementVersion.requirement_id == req_uuid)
    )

    await db.delete(req)
    await db.commit()


@router.get("/{req_id}/versions", response_model=list[VersionResponse])
async def list_requirement_versions(
    req_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid req UUID")

    req = await db.get(Requirement, req_uuid)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    is_owner = req.user_id == current_user.id
    if not is_owner and req.workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == req.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to view this requirement")
    elif not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to view this requirement")

    result = await db.execute(
        select(RequirementVersion)
        .where(RequirementVersion.requirement_id == req_uuid)
        .order_by(RequirementVersion.version_number.desc())
    )
    return result.scalars().all()
