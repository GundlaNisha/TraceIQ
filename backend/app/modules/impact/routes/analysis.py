from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.impact.models.impact import AnalysisJob, ImpactResult, JobStatus
from app.modules.impact.schemas.analysis_schemas import (
    AnalysisJobResponse,
    ImpactResultResponse,
)
from app.modules.requirement.models.req import Requirement
from app.workers.impact_analysis import run_impact_analysis

router = APIRouter(prefix="/api/v1", tags=["analysis"])

@router.post("/requirements/{req_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
async def trigger_analysis(req_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify req belongs to current_user
    stmt = select(Requirement).where(Requirement.id == req_id)
    result = await db.execute(stmt)
    req = result.scalar_one_or_none()
    
    if not req:
        raise NotFoundError("Requirement not found")
    if req.user_id != current_user.id:
        raise ForbiddenError("Not authorized to analyze this requirement")
        
    # Create AnalysisJob with status="queued"
    from app.modules.audit.models.audit import AuditLog
    job = AnalysisJob(
        user_id=current_user.id,
        requirement_id=req.id,
        repository_id=req.repository_id,
        status=JobStatus.queued
    )
    
    audit = AuditLog(
        user_id=str(current_user.id),
        action="analysis.create",
        resource_type="analysis_job",
        resource_id=""
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
async def get_job_status(job_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()
    
    if not job:
        raise NotFoundError("Analysis job not found")
    if job.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this job")
        
    return job

@router.get("/analysis/{analysis_id}", response_model=ImpactResultResponse)
async def get_analysis_result(analysis_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Returns ImpactResult — verify ownership via job → requirement → user_id
    stmt = (
        select(ImpactResult)
        .join(AnalysisJob, ImpactResult.job_id == AnalysisJob.id)
        .where(ImpactResult.job_id == analysis_id, AnalysisJob.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    impact_result = result.scalar_one_or_none()
    
    if not impact_result:
        raise NotFoundError("Impact result not found")
        
    return impact_result

@router.get("/analysis", response_model=list[AnalysisJobResponse])
async def list_analysis_jobs(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(AnalysisJob).where(AnalysisJob.user_id == current_user.id).order_by(AnalysisJob.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.delete("/analysis/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis_job(job_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    import uuid
    from fastapi import HTTPException
    
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
        
    from sqlalchemy import delete
    
    await db.execute(delete(ImpactResult).where(ImpactResult.job_id == job_uuid))
    await db.delete(job)
    await db.commit()
