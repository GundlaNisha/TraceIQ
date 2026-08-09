from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.modules.auth.models.user import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name
    }
