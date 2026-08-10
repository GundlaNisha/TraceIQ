
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.repository.models.repo import Repository
from app.modules.review.models.rev_models import CommitDiff, CommitEvent, ReviewFinding
from app.modules.review.schemas.rev_schemas import (
    CommitDiffResponse,
    CommitEventResponse,
    ReviewCreate,
    ReviewFindingResponse,
)
from app.workers.commit_review import run_commit_review

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])

@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_review(body: ReviewCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify repository ownership
    stmt = select(Repository).where(Repository.id == body.repository_id)
    result = await db.execute(stmt)
    repo = result.scalar_one_or_none()
    
    if not repo:
        raise NotFoundError("Repository not found")
    if repo.user_id != current_user.id:
        raise ForbiddenError("Not authorized to review this repository")
        
    commit_event = CommitEvent(
        repository_id=body.repository_id,
        user_id=current_user.id,
        commit_hash=body.commit_hash,
        requirement_id=body.requirement_id,
        status="queued"
    )
    db.add(commit_event)
    await db.commit()
    await db.refresh(commit_event)
    
    # Enqueue worker
    run_commit_review.delay(str(commit_event.id))
    
    return {"id": str(commit_event.id)}

@router.get("/{review_id}", response_model=CommitEventResponse)
async def get_review_status(review_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(CommitEvent).where(CommitEvent.id == review_id)
    result = await db.execute(stmt)
    commit_event = result.scalar_one_or_none()
    
    if not commit_event:
        raise NotFoundError("Review not found")
    if commit_event.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this review")
        
    return commit_event

@router.get("/{review_id}/diff", response_model=list[CommitDiffResponse])
async def get_review_diff(review_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Check ownership
    await get_review_status(review_id, current_user, db)
    
    stmt = select(CommitDiff).where(CommitDiff.commit_event_id == review_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{review_id}/findings", response_model=list[ReviewFindingResponse])
async def get_review_findings(review_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Check ownership
    await get_review_status(review_id, current_user, db)
    
    stmt = select(ReviewFinding).where(ReviewFinding.commit_event_id == review_id)
    result = await db.execute(stmt)
    return result.scalars().all()
