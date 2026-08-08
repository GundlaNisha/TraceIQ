from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundError, ForbiddenError
from app.modules.auth.models.user import User
from app.modules.requirement.models.req import Requirement
from app.modules.impact.models.impact import AnalysisJob, JobStatus, ImpactResult
from app.modules.impact.schemas.analysis_schemas import AnalysisJobResponse, ImpactResultResponse
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
    job = AnalysisJob(
        user_id=current_user.id,
        requirement_id=req.id,
        repository_id=req.repository_id,
        status=JobStatus.queued
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
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
        .where(ImpactResult.id == analysis_id, AnalysisJob.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    impact_result = result.scalar_one_or_none()
    
    if not impact_result:
        raise NotFoundError("Impact result not found")
        
    return impact_result
