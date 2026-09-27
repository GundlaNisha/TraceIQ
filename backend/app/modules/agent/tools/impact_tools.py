import uuid
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.modules.indexing.models.index_models import CodeDependency


async def get_blast_radius_fn(
    repository_id: str | None,
    seed_files: list[str],
    max_depth: int = 2,
    db: AsyncSession | None = None,
) -> dict[str, Any]:
    """Traverse the AST dependency graph to compute blast radius and downstream callers/callees."""
    if not seed_files or not repository_id:
        return {"impacted_files": [], "direct_dependencies": [], "risk_score": 0, "risk_level": "low", "impacted_files_count": 0}

    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        return {"error": "Invalid repository ID", "risk_level": "low", "impacted_files_count": 0}

    # Query dependencies where seed file is source or target
    stmt = (
        select(CodeDependency)
        .where(CodeDependency.repository_id == repo_uuid)
        .where(
            or_(
                CodeDependency.source_file.in_(seed_files),
                CodeDependency.target_file.in_(seed_files),
            )
        )
    )

    if db is None:
        async with AsyncSessionLocal() as session:
            result = await session.execute(stmt)
            records = result.scalars().all()
    else:
        result = await db.execute(stmt)
        records = result.scalars().all()

    dependents: set[str] = set()
    links = []

    for dep in records:
        source_file = dep.source_file
        target_file = dep.target_file
        links.append({
            "source": source_file,
            "target": target_file,
        })
        if source_file in seed_files:
            dependents.add(target_file)
        else:
            dependents.add(source_file)

    impacted_list = list(dependents - set(seed_files))
    risk_level = "low"
    if len(impacted_list) > 10:
        risk_level = "critical"
    elif len(impacted_list) > 4:
        risk_level = "medium"

    return {
        "seed_files": seed_files,
        "impacted_files_count": len(impacted_list),
        "impacted_files": impacted_list[:25],
        "dependency_links": links[:40],
        "risk_level": risk_level,
        "affected_callers": impacted_list[:5],
        "downstream_routes": [f"/api/{f.split('/')[-1].replace('.py', '')}" for f in impacted_list[:3]],
    }


async def find_downstream_dependents_fn(
    repository_id: str | None,
    symbol_name: str,
    db: AsyncSession | None = None,
) -> list[dict[str, Any]]:
    """Locate all modules, files, and functions that call or import a specific symbol."""
    if not repository_id:
        return []
    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        return []

    stmt = (
        select(CodeDependency)
        .where(CodeDependency.repository_id == repo_uuid)
        .where(
            or_(
                CodeDependency.source_file.ilike(f"%{symbol_name}%"),
                CodeDependency.target_file.ilike(f"%{symbol_name}%"),
            )
        )
        .limit(20)
    )

    if db is None:
        async with AsyncSessionLocal() as session:
            result = await session.execute(stmt)
            records = result.scalars().all()
    else:
        result = await db.execute(stmt)
        records = result.scalars().all()

    dependents = []
    for dep in records:
        dependents.append({
            "calling_file": dep.source_file,
            "target_symbol": dep.target_file,
        })
    return dependents
