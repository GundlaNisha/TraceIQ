"""Clerk -> DB user sync helpers.

Two paths create rows in ``users``:

1. ``upsert_user_from_clerk_event`` — invoked from the Clerk webhook handler when
   the frontend notifies us about ``user.created`` / ``user.updated``. The
   payload includes the full Clerk user object, so we get rich fields.

2. ``upsert_user_from_jwt`` — safety net for the first authenticated request
   before the webhook has fired. Uses the standard Clerk JWT claims, which are
   intentionally minimal (no image, no email_verified unless a session claim
   includes it). The row is upgraded the next time the webhook fires.

Both functions commit before returning — callers do not need to flush.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import case as sql_case
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models.user import User


def _extract_email(payload: dict[str, Any]) -> tuple[str, bool]:
    """Return ``(email, email_verified)`` from a Clerk user object.

    Clerk stores emails as a list of ``{id, email_address, verification: {...}}``
    objects. Pick the primary address (first entry), falling back to the first
    available one.
    """
    emails = payload.get("email_addresses") or []
    for entry in emails:
        addr = entry.get("email_address")
        if not addr:
            continue
        verification = entry.get("verification") or {}
        # Clerk uses status strings like "verified" / "unverified".
        verified = verification.get("status") == "verified"
        return addr, verified
    return "unknown@clerk.dev", False


def _extract_name(payload: dict[str, Any]) -> str:
    """Best-effort display name from a Clerk user payload, prioritizing username."""
    username = (payload.get("username") or "").strip()
    if username:
        return username
    
    # Last resort: use the email local-part.
    email = (payload.get("primary_email_address") or {}).get("email_address") or ""
    if "@" in email:
        return email.split("@", 1)[0] or "User"
    return "User"


async def upsert_user_from_clerk_event(
    db: AsyncSession, clerk_user: dict[str, Any]
) -> User:
    """Insert or update a user from a Clerk ``user.created`` / ``user.updated`` payload."""
    user_id = clerk_user.get("id")
    if not user_id:
        raise ValueError("Clerk user payload missing 'id'")

    email, email_verified = _extract_email(clerk_user)
    name = _extract_name(clerk_user)
    image_url = clerk_user.get("image_url") or clerk_user.get("profile_image_url")

    # Use SQLAlchemy Column objects (not attribute names) so the dialect maps
    # ``User.email_verified`` (Python attr) -> ``"emailVerified"`` (DB column).
    stmt = (
        pg_insert(User)
        .values(
            id=user_id,
            name=name,
            email=email,
            email_verified=email_verified,
            image=image_url,
        )
        .on_conflict_do_update(
            index_elements=[User.id],
            set_={
                User.name: name,
                User.email: email,
                User.email_verified: email_verified,
                User.image: image_url,
            },
        )
    )
    await db.execute(stmt)
    await db.commit()

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one()


async def delete_user(db: AsyncSession, clerk_user_id: str) -> bool:
    """Delete a user row (returns ``True`` if a row was removed)."""
    user = await db.execute(select(User).where(User.id == clerk_user_id))
    user_obj = user.scalar_one_or_none()
    if user_obj is None:
        await db.commit()
        return False
    await db.delete(user_obj)
    await db.commit()
    return True


async def upsert_user_from_jwt(db: AsyncSession, payload: dict[str, Any]) -> User:
    """Upsert from a verified Clerk session JWT — fallback for first-request sync.

    The session JWT carries the Clerk user id (``sub``) plus whatever claims the
    Clerk session template is configured to expose. The default template only
    ships ``sub``/``iss``/``exp``/``iat``; to get email/name here you must
    configure the template in the Clerk dashboard (Sessions → edit template →
    add ``email``, ``email_verified``, ``first_name``, ``last_name``,
    ``image_url``, ``username``).

    This function MUST NOT invent fake data from the user id. If a claim is
    missing we write an empty string; the webhook handler will fill the real
    value in when it fires. Likewise, on conflict we use COALESCE so a JWT
    without the email/name claims never overwrites a row that already has them.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("JWT payload missing 'sub'")

    # Only use real claim values; never derive from ``user_id``. Empty string is
    # the sentinel for "missing" — the DB columns are NOT NULL so we can't use
    # NULL here.
    email = (payload.get("email") or "").strip()
    email_verified = bool(payload.get("email_verified", False))

    # Build the display name from the username claim.
    # The user specifically requested to use username and NOT first/last name.
    # If username is missing (e.g., Google OAuth without explicitly set usernames),
    # fallback to the email prefix so we don't end up using the raw user_id.
    if payload.get("username"):
        name = str(payload["username"]).strip()
    elif payload.get("name"):
        name = str(payload["name"]).strip()
    elif email and "@" in email:
        name = email.split("@")[0].strip()
    else:
        name = ""
    image_url = payload.get("image_url")

    update_set: dict[Any, Any] = {
        User.email_verified: email_verified,
    }
    if name:
        update_set[User.name] = sql_case(
            (User.name == "", name),
            (User.name == User.id, name),
            else_=User.name,
        )
    if email:
        update_set[User.email] = sql_case(
            (User.email.endswith("@clerk.placeholder"), email),
            else_=User.email,
        )
    if image_url:
        update_set[User.image] = sql_case(
            (User.image == None, image_url),
            else_=User.image,
        )

    stmt = (
        pg_insert(User)
        .values(
            id=user_id,
            name=name or user_id,  # never store empty — DB column is NOT NULL
            email=email or f"{user_id}@clerk.placeholder",  # same constraint
            email_verified=email_verified,
            image=image_url,
        )
        .on_conflict_do_update(
            index_elements=[User.id],
            set_=update_set,
        )
    )
    await db.execute(stmt)
    await db.commit()

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one()
