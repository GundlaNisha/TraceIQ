import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.auth.services.user_sync import upsert_user_from_jwt

# Module-level JWKS client — reused across all requests to avoid redundant
# HTTP round-trips to the Clerk JWKS endpoint on every authenticated call.
_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    """Return a cached PyJWKClient, creating it lazily on first use."""
    global _jwks_client
    if _jwks_client is None and settings.clerk_jwks_url:
        _jwks_client = jwt.PyJWKClient(settings.clerk_jwks_url, cache_keys=True)
    return _jwks_client  # type: ignore[return-value]


async def get_current_user(
    request: Request, db: AsyncSession = Depends(get_db)
) -> User:
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
            user_id = "user_2k"  # dummy clerk id
            return User(id=user_id, email="dummy@clerk.com", name="Dummy User")

        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Verify the token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401, detail="Invalid token: missing subject"
            )

        # Fetch user from database
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or user.name == user.id:
            # First-authenticated-request safety net: the Clerk webhook will
            # eventually upsert this row, but for the very first request we
            # populate it from the JWT claims ourselves.
            # We also run this if the user name is stuck on the placeholder (user_id).
            user = await upsert_user_from_jwt(db, payload)

        return user

    except jwt.PyJWKClientError:
        raise HTTPException(status_code=401, detail="Unable to fetch JWKS")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e!s}")
    except (ValueError, AttributeError, KeyError) as e:
        # PyJWKClient.get_signing_key_from_jwt can raise plain Python errors
        # when the token is malformed (fewer than 3 segments, missing fields).
        # Treat any of those as a 401 — never a 500 — so a bad token from
        # the client doesn't take the API down.
        raise HTTPException(status_code=401, detail=f"Malformed token: {e!s}")
