from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.pr.models.draft import PRDraft
from app.modules.pr.schemas.draft_schemas import (
    PRDraftCreate,
    PRDraftResponse,
    PRDraftUpdate,
)
from app.workers.pr_draft import run_pr_draft_generation

router = APIRouter(prefix="/api/v1/pr-drafts", tags=["pr-drafts"])

@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_pr_draft(body: PRDraftCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    draft = PRDraft(
        user_id=current_user.id,
        requirement_id=body.requirement_id,
        commit_event_id=body.commit_event_id,
        title="",
        description_markdown="",
        status="queued"
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    
    # Enqueue worker
    run_pr_draft_generation.delay(str(draft.id))
    
    return {"job_id": str(draft.id)}

@router.get("", response_model=list[PRDraftResponse])
async def list_pr_drafts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(PRDraft).where(PRDraft.user_id == current_user.id).order_by(PRDraft.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{draft_id}", response_model=PRDraftResponse)
async def get_pr_draft(draft_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(PRDraft).where(PRDraft.id == draft_id)
    result = await db.execute(stmt)
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise NotFoundError("PR draft not found")
    if draft.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this PR draft")
        
    return draft

@router.patch("/{draft_id}", response_model=PRDraftResponse)
async def update_pr_draft(draft_id: str, body: PRDraftUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(PRDraft).where(PRDraft.id == draft_id)
    result = await db.execute(stmt)
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise NotFoundError("PR draft not found")
    if draft.user_id != current_user.id:
        raise ForbiddenError("Not authorized to edit this PR draft")
        
    if body.title is not None:
        draft.title = body.title
    if body.description_markdown is not None:
        draft.description_markdown = body.description_markdown
        
    draft.status = "edited"
    
    await db.commit()
    await db.refresh(draft)
    
    return draft

@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pr_draft(draft_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(PRDraft).where(PRDraft.id == draft_id)
    result = await db.execute(stmt)
    draft = result.scalar_one_or_none()
    
    if not draft:
        raise NotFoundError("PR draft not found")
    if draft.user_id != current_user.id:
        raise ForbiddenError("Not authorized to delete this PR draft")
        
    await db.delete(draft)
    await db.commit()
