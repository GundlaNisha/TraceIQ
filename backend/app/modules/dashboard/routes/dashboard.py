from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.impact.models.impact import AnalysisJob, ImpactResult
from app.modules.pr.models.draft import PRDraft
from app.modules.repository.models.repo import Repository, SyncStatus
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import CommitEvent

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    # 1. Repositories summary
    repos_stmt = select(Repository.sync_status).where(
        Repository.user_id == current_user.id
    )
    repos_res = await db.execute(repos_stmt)
    repos = repos_res.scalars().all()
    repo_stats = {
        "total": len(repos),
        "completed": repos.count(SyncStatus.completed),
        "syncing": repos.count(SyncStatus.syncing) + repos.count(SyncStatus.pending),
        "failed": repos.count(SyncStatus.failed),
    }

    recent_jobs = []

    # Fetch Analysis Jobs
    analysis_stmt = (
        select(AnalysisJob, Requirement.title)
        .outerjoin(Requirement, AnalysisJob.requirement_id == Requirement.id)
        .where(AnalysisJob.user_id == current_user.id)
        .order_by(desc(AnalysisJob.created_at))
        .limit(5)
    )
    analysis_res = await db.execute(analysis_stmt)
    for job, req_title in analysis_res:
        recent_jobs.append(
            {
                "id": str(job.id),
                "type": "analysis",
                "label": req_title or "Impact Analysis",
                "status": job.status,
                "created_at": job.created_at,
            }
        )

    # Fetch Commit Events (Reviews)
    commit_stmt = (
        select(CommitEvent)
        .where(CommitEvent.user_id == current_user.id)
        .order_by(desc(CommitEvent.created_at))
        .limit(5)
    )
    commit_res = await db.execute(commit_stmt)
    for ce in commit_res.scalars():
        recent_jobs.append(
            {
                "id": str(ce.id),
                "type": "review",
                "label": ce.commit_hash[:7],
                "status": ce.status,
                "created_at": ce.created_at,
            }
        )

    # Fetch PR Drafts
    pr_stmt = (
        select(PRDraft)
        .where(PRDraft.user_id == current_user.id)
        .order_by(desc(PRDraft.created_at))
        .limit(5)
    )
    pr_res = await db.execute(pr_stmt)
    for draft in pr_res.scalars():
        recent_jobs.append(
            {
                "id": str(draft.id),
                "type": "pr_draft",
                "label": draft.title or "Untitled Draft",
                "status": draft.status,
                "created_at": draft.created_at,
            }
        )

    # Sort all recent_jobs by created_at DESC and take top 5
    recent_jobs.sort(key=lambda x: x["created_at"], reverse=True)
    recent_jobs = recent_jobs[:5]

    # 3. Recent Analyses (Completed ones with ImpactResults)
    recent_analyses = []
    ra_stmt = (
        select(
            AnalysisJob.id,
            Requirement.title,
            Repository.name,
            ImpactResult.impacted_files,
        )
        .join(ImpactResult, AnalysisJob.id == ImpactResult.job_id)
        .outerjoin(Requirement, AnalysisJob.requirement_id == Requirement.id)
        .outerjoin(Repository, AnalysisJob.repository_id == Repository.id)
        .where(AnalysisJob.user_id == current_user.id)
        .order_by(desc(AnalysisJob.created_at))
        .limit(5)
    )
    ra_res = await db.execute(ra_stmt)
    for j_id, req_title, repo_name, impacted_files in ra_res:
        # impacted_files is always a dict produced by ai_result.model_dump().
        # The actual list of files lives under the "impacted_files" key.
        files_list = (
            impacted_files.get("impacted_files", [])
            if isinstance(impacted_files, dict)
            else []
        )
        recent_analyses.append(
            {
                "id": str(j_id),
                "requirement_title": req_title or "Impact Analysis",
                "repository": repo_name or "Unknown Repository",
                "impacted_files_count": len(files_list),
            }
        )

    # 4. Recent PR Drafts (for the list in dashboard)
    recent_pr_drafts = []
    pr_list_stmt = (
        select(PRDraft.id, PRDraft.title, PRDraft.status)
        .where(PRDraft.user_id == current_user.id)
        .order_by(desc(PRDraft.created_at))
        .limit(5)
    )
    pr_list_res = await db.execute(pr_list_stmt)
    for d_id, d_title, d_status in pr_list_res:
        recent_pr_drafts.append(
            {"id": str(d_id), "title": d_title or "Untitled Draft", "status": d_status}
        )

    return {
        "repositories": repo_stats,
        "recentJobs": recent_jobs,
        "recentAnalyses": recent_analyses,
        "recentPRDrafts": recent_pr_drafts,
    }
