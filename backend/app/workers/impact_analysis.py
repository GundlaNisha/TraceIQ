import asyncio
import logging

from sqlalchemy import or_, select

from app.ai.router.dispatcher import dispatch_impact_analysis
from app.db.session import get_worker_session
from app.modules.auth.models.user import User  # noqa: F401
from app.modules.impact.models.impact import AnalysisJob, ImpactResult, JobStatus
from app.modules.indexing.models.index_models import (
    CodeChunk,
    CodeDependency,
    RepositoryFile,
)
from app.modules.repository.models.repo import Repository  # noqa: F401
from app.modules.requirement.models.req import Requirement
from app.modules.retrieval.services.semantic import hybrid_code_search
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _run_impact_analysis_async(job_id: str):
    async with get_worker_session() as db:
        try:
            # 1. Fetch AnalysisJob
            stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
            result = await db.execute(stmt)
            job = result.scalar_one_or_none()
            if not job:
                logger.error(f"AnalysisJob {job_id} not found — aborting.")
                return

            # 2. Set status="running", progress=15
            job.status = JobStatus.running
            job.progress = 15
            await db.commit()

            # 3. Fetch Requirement text
            stmt_req = select(Requirement).where(Requirement.id == job.requirement_id)
            result_req = await db.execute(stmt_req)
            req = result_req.scalar_one()

            # 4. Multi-Signal Hybrid Code Search to find seed candidate files (< 15ms)
            search_results = await hybrid_code_search(
                db, req.text, job.repository_id, top_k=10
            )

            seed_files = list({item["file_path"] for item in search_results})
            chunks = [
                {"file_path": item["file_path"], "chunk_text": item["snippet"]}
                for item in search_results
            ]

            # 5. Graph-Augmented RAG: Traverse 1-hop & 2-hop dependencies in Code Graph
            dependencies: list[dict] = []
            if seed_files:
                # Query dependencies where seed file is source OR target
                dep_conditions = []
                for sf in seed_files:
                    # Match exact or suffix
                    dep_conditions.append(CodeDependency.source_file == sf)
                    dep_conditions.append(CodeDependency.target_file == sf)
                    dep_conditions.append(CodeDependency.source_file.ilike(f"%{sf}%"))
                    dep_conditions.append(CodeDependency.target_file.ilike(f"%{sf}%"))

                dep_stmt = (
                    select(CodeDependency)
                    .where(
                        CodeDependency.repository_id == job.repository_id,
                        or_(*dep_conditions),
                    )
                    .limit(50)
                )
                dep_res = await db.execute(dep_stmt)
                for dep in dep_res.scalars().all():
                    dependencies.append(
                        {"source": dep.source_file, "target": dep.target_file}
                    )

                # Fetch 1-hop downstream/upstream chunks if missing
                connected_files = set()
                for d in dependencies:
                    if d["source"] not in seed_files:
                        connected_files.add(d["source"])
                    if d["target"] not in seed_files:
                        connected_files.add(d["target"])

                if connected_files:
                    hop_stmt = (
                        select(CodeChunk, RepositoryFile)
                        .join(RepositoryFile, CodeChunk.file_id == RepositoryFile.id)
                        .where(
                            RepositoryFile.repository_id == job.repository_id,
                            RepositoryFile.file_path.in_(list(connected_files)[:8]),
                        )
                        .limit(8)
                    )
                    hop_res = await db.execute(hop_stmt)
                    for chunk_rec, rf in hop_res.all():
                        chunks.append(
                            {
                                "file_path": rf.file_path,
                                "chunk_text": chunk_rec.chunk_text,
                            }
                        )

            # 6. Set progress=50
            job.progress = 50
            await db.commit()

            # 7. Dispatch Graph-Augmented Impact Analysis to AI
            ai_result = await dispatch_impact_analysis(req.text, chunks, dependencies)

            # 8. Set progress=85
            job.progress = 85
            await db.commit()

            # 9. Insert ImpactResult
            impact_result = ImpactResult(
                job_id=job.id, impacted_files=ai_result.model_dump()
            )
            db.add(impact_result)

            # 10. Set status="completed", progress=100
            job.status = JobStatus.completed
            job.progress = 100
            await db.commit()
            logger.info(
                f"⚡ Graph-Augmented Impact analysis {job_id} completed successfully."
            )

        except Exception:
            logger.exception(f"Impact analysis {job_id} failed")
            await db.rollback()
            try:
                stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
                result = await db.execute(stmt)
                job = result.scalar_one_or_none()
                if job:
                    job.status = JobStatus.failed
                    await db.commit()
            except Exception as inner_exc:
                logger.error(
                    f"Could not update job {job_id} status to failed: {inner_exc!s}"
                )


@celery_app.task
def run_impact_analysis(job_id: str) -> None:
    asyncio.run(_run_impact_analysis_async(job_id))
