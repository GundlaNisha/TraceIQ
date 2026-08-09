from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.core.config import settings
import jwt

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    
    token = auth_header.split(" ")[1]
    
    try:
        # Fetch the JWKS from Clerk
        if not settings.clerk_jwks_url:
            # Fallback for development if not configured
            user_id = "user_2k" # dummy clerk id
            return User(id=user_id, email="dummy@clerk.com", name="Dummy User")

        jwks_client = jwt.PyJWKClient(settings.clerk_jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Verify the token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject")
            
        # Fetch user from database
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            # Upsert or just return a dummy for now. 
            # In a real Clerk setup, you'd use a webhook to sync users.
            user = User(id=user_id, email="unknown@clerk.dev", name="Unknown")
            
        return user
        
    except jwt.PyJWKClientError as e:
        raise HTTPException(status_code=401, detail="Unable to fetch JWKS")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
