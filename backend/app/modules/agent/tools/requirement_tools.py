import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.modules.requirement.models.req import Requirement


async def fetch_requirement_details_fn(
    requirement_id: str,
    db: AsyncSession | None = None,
) -> dict[str, Any] | None:
    """Fetch full requirement specifications, Jira key, and version information."""
    try:
        req_uuid = uuid.UUID(requirement_id)
    except ValueError:
        return None

    if db is None:
        async with AsyncSessionLocal() as session:
            stmt = select(Requirement).where(Requirement.id == req_uuid)
            result = await session.execute(stmt)
            req = result.scalar_one_or_none()
    else:
        stmt = select(Requirement).where(Requirement.id == req_uuid)
        result = await db.execute(stmt)
        req = result.scalar_one_or_none()

    if not req:
        return None

    return {
        "id": str(req.id),
        "title": req.title,
        "text": req.text,
        "jira_key": req.jira_key,
        "version": req.version_number,
        "source": req.source,
        "workspace_id": str(req.workspace_id) if req.workspace_id else None,
    }


async def list_workspace_requirements_fn(
    workspace_id: str,
    db: AsyncSession | None = None,
    limit: int = 15,
) -> list[dict[str, Any]]:
    """List available requirements in the workspace for requirement selection and linking."""
    try:
        ws_uuid = uuid.UUID(workspace_id)
    except ValueError:
        return []

    stmt = (
        select(Requirement)
        .where(Requirement.workspace_id == ws_uuid)
        .order_by(Requirement.created_at.desc())
        .limit(limit)
    )
    if db is None:
        async with AsyncSessionLocal() as session:
            result = await session.execute(stmt)
            reqs = result.scalars().all()
    else:
        result = await db.execute(stmt)
        reqs = result.scalars().all()

    requirements = []
    for req in reqs:
        requirements.append({
            "id": str(req.id),
            "title": req.title,
            "jira_key": req.jira_key,
            "summary": req.text[:120] if req.text else "",
        })
    return requirements
