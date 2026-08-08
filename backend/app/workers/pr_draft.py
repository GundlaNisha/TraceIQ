import asyncio
from celery.utils.log import get_task_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.workers.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.modules.pr.models.draft import PRDraft
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import CommitDiff, ReviewFinding
from app.ai.router.dispatcher import dispatch_pr_generation

logger = get_task_logger(__name__)

async def _process_pr_draft(draft_id: str):
    async with AsyncSessionLocal() as session:
        try:
            # 1. Fetch PRDraft
            stmt = select(PRDraft).where(PRDraft.id == draft_id)
            result = await session.execute(stmt)
            draft = result.scalar_one_or_none()
            if not draft:
                logger.error(f"PRDraft {draft_id} not found.")
                return

            # Fetch Requirement Text
            req_text = ""
            if draft.requirement_id:
                req_stmt = select(Requirement).where(Requirement.id == draft.requirement_id)
                req_res = await session.execute(req_stmt)
                req = req_res.scalar_one_or_none()
                if req:
                    req_text = req.text

            # 2. Fetch CommitDiff rows and build summary
            diff_summary = "No commit diffs found."
            if draft.commit_event_id:
                diff_stmt = select(CommitDiff).where(CommitDiff.commit_event_id == draft.commit_event_id)
                diff_res = await session.execute(diff_stmt)
                diffs = diff_res.scalars().all()
                if diffs:
                    summary_lines = []
                    for d in diffs:
                        summary_lines.append(f"Modified: {d.file_path} (+{d.additions} -{d.deletions})")
                    diff_summary = "\n".join(summary_lines)

            # 3. Fetch ReviewFinding rows
            findings_data = []
            if draft.commit_event_id:
                find_stmt = select(ReviewFinding).where(ReviewFinding.commit_event_id == draft.commit_event_id)
                find_res = await session.execute(find_stmt)
                findings = find_res.scalars().all()
                for f in findings:
                    findings_data.append({
                        "file_path": f.file_path,
                        "line_number": f.line_number,
                        "severity": f.severity,
                        "message": f.message
                    })

            # 4. Dispatch to LLM
            ai_result = await dispatch_pr_generation(req_text, diff_summary, findings_data)

            # 5. Save generated text to DB
            draft.title = ai_result.title
            draft.description_markdown = ai_result.description_markdown
            draft.status = "completed"
            
            await session.commit()
            
        except Exception as e:
            logger.error(f"PR draft generation failed for {draft_id}: {str(e)}")
            await session.rollback()
            # Attempt to set status to failed
            stmt = select(PRDraft).where(PRDraft.id == draft_id)
            result = await session.execute(stmt)
            draft = result.scalar_one_or_none()
            if draft:
                draft.status = "failed"
                await session.commit()

@celery_app.task
def run_pr_draft_generation(draft_job_id: str):
    asyncio.run(_process_pr_draft(draft_job_id))
