from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
    }


@router.patch("/me")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.name = body.name.strip()
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
    }
