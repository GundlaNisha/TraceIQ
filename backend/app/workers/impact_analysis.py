import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.workers.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.modules.impact.models.impact import AnalysisJob, JobStatus, ImpactResult
from app.modules.requirement.models.req import Requirement
from app.modules.retrieval.services.semantic import semantic_search
from app.ai.router.dispatcher import dispatch_impact_analysis

async def _run_impact_analysis_async(job_id: str):
    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch AnalysisJob
            stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
            result = await db.execute(stmt)
            job = result.scalar_one_or_none()
            if not job:
                return

            # 2. Set status="running", progress=10
            job.status = JobStatus.running
            job.progress = 10
            await db.commit()
            
            # 3. Fetch Requirement text
            stmt_req = select(Requirement).where(Requirement.id == job.requirement_id)
            result_req = await db.execute(stmt_req)
            req = result_req.scalar_one()
            
            # 4. Call semantic_search
            # returns list of dicts: {"file_path": str, "match_type": str, "snippet": str, "score": float}
            search_results = await semantic_search(db, req.text, str(job.repository_id), top_k=15)
            
            # Map search_results to chunks format expected by dispatcher: {"file_path": str, "chunk_text": str}
            chunks = [{"file_path": item["file_path"], "chunk_text": item["snippet"]} for item in search_results]

            # 5. Set progress=40
            job.progress = 40
            await db.commit()
            
            # 6. Dispatch impact analysis
            ai_result = await dispatch_impact_analysis(req.text, chunks)
            
            # 7. Set progress=80
            job.progress = 80
            await db.commit()
            
            # 8. Insert ImpactResult
            impact_result = ImpactResult(
                job_id=job.id,
                impacted_files=ai_result.model_dump()
            )
            db.add(impact_result)
            
            # 9. Set status="completed", progress=100
            job.status = JobStatus.completed
            job.progress = 100
            await db.commit()
            
        except Exception as e:
            await db.rollback()
            # On exception, try to mark as failed
            stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
            result = await db.execute(stmt)
            job = result.scalar_one_or_none()
            if job:
                job.status = JobStatus.failed
                await db.commit()
            raise e

@celery_app.task
def run_impact_analysis(job_id: str):
    asyncio.run(_run_impact_analysis_async(job_id))
