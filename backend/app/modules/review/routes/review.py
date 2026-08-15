import re
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
from app.modules.review.models.rev_models import CommitDiff, CommitEvent, ReviewFinding
from app.modules.review.schemas.rev_schemas import (
    CommitDiffResponse,
    CommitEventResponse,
    ReviewCreate,
    ReviewFindingResponse,
)
from app.workers.commit_review import run_commit_review

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])


@router.get("", response_model=list[CommitEventResponse])
async def get_reviews(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(CommitEvent)
        .where(CommitEvent.user_id == current_user.id)
        .order_by(desc(CommitEvent.created_at))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_review(
    body: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate commit hash format (7–40 lowercase hex characters)
    if not re.fullmatch(r"[0-9a-fA-F]{7,40}", body.commit_hash):
        raise HTTPException(
            status_code=400,
            detail="commit_hash must be a valid git commit SHA (7–40 hex characters)",
        )

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

    commit_event = CommitEvent(
        repository_id=body.repository_id,
        user_id=current_user.id,
        commit_hash=body.commit_hash,
        requirement_id=body.requirement_id,
        status="queued",
    )
    db.add(commit_event)
    await db.commit()
    await db.refresh(commit_event)

    # Enqueue worker
    run_commit_review.delay(str(commit_event.id))

    return {"id": str(commit_event.id)}


@router.get("/{review_id}", response_model=CommitEventResponse)
async def get_review_status(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    commit_event = await db.get(CommitEvent, review_uuid)
    if not commit_event:
        raise NotFoundError("Review not found")
    if commit_event.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this review")

    return commit_event


@router.get("/{review_id}/diff", response_model=list[CommitDiffResponse])
async def get_review_diff(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    commit_event = await db.get(CommitEvent, review_uuid)
    if not commit_event:
        raise NotFoundError("Review not found")
    if commit_event.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this review")

    stmt = select(CommitDiff).where(CommitDiff.commit_event_id == review_uuid)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{review_id}/findings", response_model=list[ReviewFindingResponse])
async def get_review_findings(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    commit_event = await db.get(CommitEvent, review_uuid)
    if not commit_event:
        raise NotFoundError("Review not found")
    if commit_event.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this review")

    stmt = select(ReviewFinding).where(ReviewFinding.commit_event_id == review_uuid)
    result = await db.execute(stmt)
    return result.scalars().all()
