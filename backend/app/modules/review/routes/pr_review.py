import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRReview, PRReviewFinding
from app.modules.review.schemas.rev_schemas import (
    PRReviewCreate,
    PRReviewFindingResponse,
    PRReviewResponse,
)
from app.workers.pr_review import run_pr_review

router = APIRouter(prefix="/api/v1/pr-reviews", tags=["pr-reviews"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_pr_review(
    body: PRReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an AI PR review job for a GitHub Pull Request."""
    # Verify repository ownership
    repo = await db.get(Repository, body.repository_id)
    if not repo:
        raise NotFoundError("Repository not found")
    if repo.user_id != current_user.id:
        raise ForbiddenError("Not authorized to review this repository")

    # Verify requirement ownership if provided
    if body.requirement_id:
        req = await db.get(Requirement, body.requirement_id)
        if not req:
            raise NotFoundError("Requirement not found")
        if req.user_id != current_user.id:
            raise ForbiddenError("Not authorized to use this requirement")

    pr_review = PRReview(
        user_id=current_user.id,
        repository_id=body.repository_id,
        pr_number=body.pr_number,
        pr_title=body.pr_title,
        pr_html_url=body.pr_html_url,
        requirement_id=body.requirement_id,
        status="queued",
    )
    db.add(pr_review)
    await db.commit()
    await db.refresh(pr_review)

    # Enqueue Celery worker
    run_pr_review.delay(str(pr_review.id))

    return {"id": str(pr_review.id)}


@router.get("", response_model=list[PRReviewResponse])
async def list_pr_reviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all PR reviews for the current user."""
    result = await db.execute(
        select(PRReview)
        .where(PRReview.user_id == current_user.id)
        .order_by(desc(PRReview.created_at))
    )
    return result.scalars().all()


@router.get("/{review_id}", response_model=PRReviewResponse)
async def get_pr_review(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single PR review by ID."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    result = await db.execute(select(PRReview).where(PRReview.id == review_uuid))
    pr_review = result.scalar_one_or_none()
    if not pr_review:
        raise NotFoundError("PR review not found")
    if pr_review.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this PR review")
    return pr_review


@router.get("/{review_id}/findings", response_model=list[PRReviewFindingResponse])
async def get_pr_review_findings(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all AI findings for a specific PR review."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    # Verify ownership
    result = await db.execute(select(PRReview).where(PRReview.id == review_uuid))
    pr_review = result.scalar_one_or_none()
    if not pr_review:
        raise NotFoundError("PR review not found")
    if pr_review.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this PR review")

    findings_res = await db.execute(
        select(PRReviewFinding).where(PRReviewFinding.pr_review_id == review_uuid)
    )
    return findings_res.scalars().all()
