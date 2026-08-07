from fastapi import Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.db.session import get_db
from app.modules.auth.models.user import User
from app.core.config import settings

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    # ----------------------------------------------------
    # TEMPORARY MOCK FOR TESTING WITHOUT FRONTEND
    # ----------------------------------------------------
    import uuid
    dummy_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    result = await db.execute(select(User).where(User.id == dummy_id))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            id=dummy_id,
            name="Test User",
            email="test@example.com",
            email_verified=True,
            image=None
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    return user
    # ----------------------------------------------------
