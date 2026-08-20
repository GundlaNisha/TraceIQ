from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.impact.models.impact import AnalysisJob, ImpactResult
from app.modules.repository.models.repo import Repository, SyncStatus
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRReview

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

    # Fetch PR Reviews
    pr_review_stmt = (
        select(PRReview)
        .where(PRReview.user_id == current_user.id)
        .order_by(desc(PRReview.created_at))
        .limit(5)
    )
    pr_review_res = await db.execute(pr_review_stmt)
    recent_pr_reviews = []
    for pr_rev in pr_review_res.scalars():
        label = (
            f"PR #{pr_rev.pr_number}: {pr_rev.pr_title}"
            if pr_rev.pr_title
            else f"PR #{pr_rev.pr_number}"
        )
        recent_jobs.append(
            {
                "id": str(pr_rev.id),
                "type": "pr_review",
                "label": label,
                "status": pr_rev.status,
                "created_at": pr_rev.created_at,
            }
        )
        recent_pr_reviews.append(
            {
                "id": str(pr_rev.id),
                "pr_number": pr_rev.pr_number,
                "title": pr_rev.pr_title or f"PR #{pr_rev.pr_number}",
                "status": pr_rev.status,
                "summary": pr_rev.summary,
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

    return {
        "repositories": repo_stats,
        "recentJobs": recent_jobs,
        "recentAnalyses": recent_analyses,
        "recentPRReviews": recent_pr_reviews,
    }
