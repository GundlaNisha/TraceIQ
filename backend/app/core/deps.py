from fastapi import Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.db.session import get_db
from app.modules.auth.models.user import User
from app.core.config import settings

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    # 1. Check if we have a cookie or auth header
    cookie_header = request.headers.get("cookie")
    auth_header = request.headers.get("authorization")
    
    if not cookie_header and not auth_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    headers = {}
    if cookie_header:
        headers["cookie"] = cookie_header
    if auth_header:
        headers["authorization"] = auth_header

    # 2. Call Neon Auth (Better Auth) /get-session endpoint to verify
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.neon_auth_url}/get-session",
                headers=headers
            )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Auth server unreachable")
        
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
        
    data = resp.json()
    if not data or not data.get("session"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
        
    user_id = data["session"].get("userId")
    
    # 3. Fetch the mapped user from our database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found in database")
        
    return user
