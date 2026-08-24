import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.modules.audit.models.audit import AuditLog
from app.modules.auth.models.user import User
from app.modules.impact.models.impact import AnalysisJob, ImpactResult, JobStatus
from app.modules.impact.schemas.analysis_schemas import (
    AnalysisJobResponse,
    ImpactResultResponse,
)
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.workspace.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.workers.impact_analysis import run_impact_analysis

router = APIRouter(prefix="/api/v1", tags=["analysis"])


@router.post("/requirements/{req_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
async def trigger_analysis(
    req_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        req_uuid = uuid.UUID(req_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid requirement UUID")

    # Verify requirement exists
    stmt = select(Requirement).where(Requirement.id == req_uuid)
    result = await db.execute(stmt)
    req = result.scalar_one_or_none()

    if not req:
        raise NotFoundError("Requirement not found")

    # Check permission (own requirement OR member/admin/owner of workspace)
    is_owner = req.user_id == current_user.id
    if not is_owner and req.workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == req.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        member = mem_res.scalar_one_or_none()
        if not member or member.role == WorkspaceRole.viewer:
            raise ForbiddenError("Viewers cannot trigger impact analysis")
    elif not is_owner:
        raise ForbiddenError("Not authorized to analyze this requirement")

    # Create AnalysisJob with status="queued"
    job = AnalysisJob(
        user_id=current_user.id,
        requirement_id=req.id,
        repository_id=req.repository_id,
        status=JobStatus.queued,
    )

    audit = AuditLog(
        user_id=str(current_user.id),
        action="analysis.create",
        resource_type="analysis_job",
        resource_id="",
    )
    db.add(job)
    db.add(audit)
    await db.commit()
    await db.refresh(job)

    audit.resource_id = str(job.id)
    await db.commit()

    # Trigger Celery task
    run_impact_analysis.delay(str(job.id))

    return {"job_id": str(job.id)}


@router.get("/analysis/jobs/{job_id}", response_model=AnalysisJobResponse)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job UUID")

    stmt = (
        select(
            AnalysisJob,
            Requirement.title.label("requirement_title"),
            Repository.name.label("repository_name"),
            Repository.workspace_id.label("repo_workspace_id"),
        )
        .outerjoin(Requirement, AnalysisJob.requirement_id == Requirement.id)
        .outerjoin(Repository, AnalysisJob.repository_id == Repository.id)
        .where(AnalysisJob.id == job_uuid)
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise NotFoundError("Analysis job not found")
    job, req_title, repo_name, repo_workspace_id = row

    is_owner = job.user_id == current_user.id
    if not is_owner and repo_workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == repo_workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            raise ForbiddenError("Not authorized to view this job")
    elif not is_owner:
        raise ForbiddenError("Not authorized to view this job")

    return {
        "id": job.id,
        "status": job.status,
        "progress": job.progress,
        "requirement_id": job.requirement_id,
        "repository_id": job.repository_id,
        "created_at": job.created_at,
        "requirement_title": req_title,
        "repository_name": repo_name,
    }


@router.get("/analysis/{analysis_id}", response_model=ImpactResultResponse)
async def get_analysis_result(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        analysis_uuid = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid analysis UUID")

    stmt = (
        select(ImpactResult, AnalysisJob, Repository.workspace_id.label("repo_workspace_id"))
        .join(AnalysisJob, ImpactResult.job_id == AnalysisJob.id)
        .outerjoin(Repository, AnalysisJob.repository_id == Repository.id)
        .where(ImpactResult.job_id == analysis_uuid)
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise NotFoundError("Impact result not found")
    impact_result, job, repo_workspace_id = row

    is_owner = job.user_id == current_user.id
    if not is_owner and repo_workspace_id:
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == repo_workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            raise ForbiddenError("Not authorized to view this result")
    elif not is_owner:
        raise ForbiddenError("Not authorized to view this result")

    return impact_result


@router.get("/analysis", response_model=list[AnalysisJobResponse])
async def list_analysis_jobs(
    repo_id: uuid.UUID | None = None,
    requirement_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(
            AnalysisJob,
            Requirement.title.label("requirement_title"),
            Repository.name.label("repository_name"),
            Repository.workspace_id.label("workspace_id"),
            Workspace.name.label("workspace_name"),
        )
        .outerjoin(Requirement, AnalysisJob.requirement_id == Requirement.id)
        .outerjoin(Repository, AnalysisJob.repository_id == Repository.id)
        .outerjoin(Workspace, Repository.workspace_id == Workspace.id)
    )

    if repo_id:
        stmt = stmt.where(AnalysisJob.repository_id == repo_id)
    elif requirement_id:
        stmt = stmt.where(AnalysisJob.requirement_id == requirement_id)
    else:
        # Repositories owned by user OR in workspaces user belongs to
        user_ws_subquery = select(WorkspaceMember.workspace_id).where(
            WorkspaceMember.user_id == current_user.id
        )
        ws_repo_subquery = select(Repository.id).where(
            Repository.workspace_id.in_(user_ws_subquery)
        )

        stmt = stmt.where(
            (AnalysisJob.user_id == current_user.id)
            | (AnalysisJob.repository_id.in_(ws_repo_subquery))
        )

    stmt = stmt.order_by(AnalysisJob.created_at.desc())
    result = await db.execute(stmt)
    jobs = []
    for job, req_title, repo_name, ws_id, ws_name in result.all():
        jobs.append(
            {
                "id": job.id,
                "status": job.status,
                "progress": job.progress,
                "requirement_id": job.requirement_id,
                "repository_id": job.repository_id,
                "created_at": job.created_at,
                "requirement_title": req_title,
                "repository_name": repo_name,
                "workspace_id": ws_id,
                "workspace_name": ws_name,
            }
        )
    return jobs


@router.delete("/analysis/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job UUID")

    stmt = select(AnalysisJob).where(AnalysisJob.id == job_uuid)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if not job:
        raise NotFoundError("Analysis job not found")
    if job.user_id != current_user.id:
        raise ForbiddenError("Not authorized to delete this job")

    # Clean up results
    await db.execute(delete(ImpactResult).where(ImpactResult.job_id == job_uuid))
    await db.delete(job)
    await db.commit()
