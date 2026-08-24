import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_active_workspace_id, get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.impact.models.impact import AnalysisJob, ImpactResult
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRReview, PRReviewFinding
from app.modules.workspace.models.workspace import WorkspaceMember
from app.modules.traceability.schemas.traceability import (
    TraceabilityAnalysisItem,
    TraceabilityFindingSummary,
    TraceabilityMatrixResponse,
    TraceabilityReviewItem,
    TraceabilityRow,
    TraceabilitySummary,
)

router = APIRouter(prefix="/api/v1/traceability", tags=["traceability"])


@router.get("", response_model=TraceabilityMatrixResponse)
async def get_traceability_matrix(
    request: Request,
    repository_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the comprehensive Traceability Matrix linking Requirements,
    Impact Analyses, PR Reviews, and Compliance Verification.
    """
    target_ws = get_active_workspace_id(request)

    # 1. Query Requirements with Repository
    req_stmt = (
        select(Requirement, Repository.name)
        .join(Repository, Requirement.repository_id == Repository.id)
    )

    if target_ws:
        req_stmt = req_stmt.where(Requirement.workspace_id == target_ws)
    elif repository_id:
        try:
            repo_uuid = uuid.UUID(repository_id)
            req_stmt = req_stmt.where(Requirement.repository_id == repo_uuid)
        except ValueError:
            pass
    else:
        user_ws_subq = select(WorkspaceMember.workspace_id).where(
            WorkspaceMember.user_id == current_user.id
        )
        req_stmt = req_stmt.where(
            (Requirement.user_id == current_user.id)
            | (Requirement.workspace_id.in_(user_ws_subq))
        )

    if repository_id and target_ws:
        try:
            repo_uuid = uuid.UUID(repository_id)
            req_stmt = req_stmt.where(Requirement.repository_id == repo_uuid)
        except ValueError:
            pass

    req_stmt = req_stmt.order_by(desc(Requirement.updated_at))
    req_res = await db.execute(req_stmt)
    requirements_data = req_res.all()

    items: list[TraceabilityRow] = []

    verified_count = 0
    gaps_count = 0
    in_progress_count = 0
    pending_count = 0

    for req, repo_name in requirements_data:
        # Fetch latest analysis job & impact result for this requirement
        analysis_stmt = (
            select(AnalysisJob, ImpactResult)
            .outerjoin(ImpactResult, AnalysisJob.id == ImpactResult.job_id)
            .where(AnalysisJob.requirement_id == req.id)
            .order_by(desc(AnalysisJob.created_at))
            .limit(1)
        )
        analysis_res = await db.execute(analysis_stmt)
        analysis_row = analysis_res.first()

        latest_analysis = None
        if analysis_row and analysis_row[0]:
            job, impact = analysis_row
            impacted_files_count = 0
            high_risk_count = 0
            if impact and isinstance(impact.impacted_files, dict):
                files = impact.impacted_files.get("impacted_files", [])
                impacted_files_count = len(files)
                high_risk_count = sum(
                    1 for f in files if (f.get("confidence") or 0) >= 0.6
                )

            latest_analysis = TraceabilityAnalysisItem(
                id=job.id,
                status=job.status,
                impacted_files_count=impacted_files_count,
                high_risk_count=high_risk_count,
                created_at=job.created_at,
            )

        # Fetch all PR reviews for this requirement
        pr_stmt = (
            select(PRReview)
            .where(PRReview.requirement_id == req.id)
            .order_by(desc(PRReview.created_at))
        )
        pr_res = await db.execute(pr_stmt)
        reviews = pr_res.scalars().all()

        review_items: list[TraceabilityReviewItem] = []
        has_running_review = False
        has_completed_review = False
        total_high = 0
        total_medium = 0
        total_low = 0
        total_req_gaps = 0

        for r in reviews:
            if r.status == "running" or r.status == "queued":
                has_running_review = True
            elif r.status == "completed":
                has_completed_review = True

            # Fetch findings for this review
            f_stmt = select(PRReviewFinding).where(PRReviewFinding.pr_review_id == r.id)
            f_res = await db.execute(f_stmt)
            findings = f_res.scalars().all()

            h = sum(1 for f in findings if f.severity == "high")
            m = sum(1 for f in findings if f.severity == "medium")
            low = sum(1 for f in findings if f.severity == "low")
            gaps = sum(1 for f in findings if f.requirement_gap)

            total_high += h
            total_medium += m
            total_low += low
            total_req_gaps += gaps

            review_items.append(
                TraceabilityReviewItem(
                    id=r.id,
                    pr_number=r.pr_number,
                    pr_title=r.pr_title or f"PR #{r.pr_number}",
                    pr_html_url=r.pr_html_url or "",
                    status=r.status,
                    summary=r.summary,
                    finding_counts=TraceabilityFindingSummary(
                        high=h,
                        medium=m,
                        low=low,
                        total=len(findings),
                        gaps_count=gaps,
                    ),
                    created_at=r.created_at,
                )
            )

        # Determine compliance status and score
        if has_running_review or (
            latest_analysis and latest_analysis.status == "running"
        ):
            status = "in_progress"
            score = 60
            in_progress_count += 1
        elif has_completed_review:
            if total_high == 0 and total_req_gaps == 0:
                status = "verified"
                score = 100 if total_medium == 0 else 90
                verified_count += 1
            else:
                status = "gaps_flagged"
                deduction = (
                    (total_high * 25) + (total_req_gaps * 20) + (total_medium * 5)
                )
                score = max(20, 100 - deduction)
                gaps_count += 1
        else:
            status = "pending_verification"
            score = 40 if latest_analysis else 0
            pending_count += 1

        items.append(
            TraceabilityRow(
                requirement_id=req.id,
                title=req.title,
                version_number=req.version_number,
                text=req.text,
                repository_id=req.repository_id,
                repository_name=repo_name,
                created_at=req.created_at,
                compliance_status=status,
                compliance_score=score,
                latest_analysis=latest_analysis,
                reviews=review_items,
            )
        )

    total_reqs = len(items)
    overall_coverage = (
        round(((verified_count + gaps_count) / total_reqs) * 100)
        if total_reqs > 0
        else 0
    )

    summary = TraceabilitySummary(
        total_requirements=total_reqs,
        verified_count=verified_count,
        gaps_count=gaps_count,
        in_progress_count=in_progress_count,
        pending_count=pending_count,
        overall_coverage_pct=overall_coverage,
    )

    return TraceabilityMatrixResponse(summary=summary, items=items)
