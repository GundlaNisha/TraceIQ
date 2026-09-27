import uuid
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.indexing.models.index_models import CodeDependency, RepositoryFile


async def get_blast_radius_fn(
    db: AsyncSession,
    repository_id: str,
    seed_files: list[str],
    max_depth: int = 2,
) -> dict[str, Any]:
    """Traverse the AST dependency graph to compute blast radius and downstream callers/callees."""
    if not seed_files:
        return {"impacted_files": [], "direct_dependencies": [], "risk_score": 0}

    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        return {"error": "Invalid repository ID"}

    # Query dependencies where seed file is source or target
    stmt = (
        select(CodeDependency, RepositoryFile)
        .join(RepositoryFile, CodeDependency.file_id == RepositoryFile.id)
        .where(RepositoryFile.repository_id == repo_uuid)
        .where(
            or_(
                RepositoryFile.file_path.in_(seed_files),
                CodeDependency.target_symbol.in_(seed_files),
            )
        )
    )
    result = await db.execute(stmt)
    records = result.all()

    dependents: set[str] = set()
    links = []

    for dep, file in records:
        source_file = file.file_path
        target_symbol = dep.target_symbol
        links.append({
            "source": source_file,
            "target": target_symbol,
            "type": dep.dependency_type,
        })
        if source_file in seed_files:
            dependents.add(target_symbol)
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
    }


async def find_downstream_dependents_fn(
    db: AsyncSession,
    repository_id: str,
    symbol_name: str,
) -> list[dict[str, Any]]:
    """Locate all modules, files, and functions that call or import a specific symbol."""
    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        return []

    stmt = (
        select(CodeDependency, RepositoryFile)
        .join(RepositoryFile, CodeDependency.file_id == RepositoryFile.id)
        .where(RepositoryFile.repository_id == repo_uuid)
        .where(CodeDependency.target_symbol.ilike(f"%{symbol_name}%"))
        .limit(20)
    )
    result = await db.execute(stmt)
    dependents = []
    for dep, file in result.all():
        dependents.append({
            "calling_file": file.file_path,
            "target_symbol": dep.target_symbol,
            "dependency_type": dep.dependency_type,
            "line_number": dep.line_number,
        })
    return dependents
