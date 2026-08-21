import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.indexing.models.index_models import CodeSymbol, RepositoryFile
from app.modules.repository.models.repo import Repository
from app.modules.retrieval.schemas.search_schemas import SearchResultItem
from app.modules.retrieval.services.semantic import hybrid_code_search

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("/code", response_model=list[SearchResultItem])
async def search_code(
    q: str = Query(..., min_length=1),
    repository_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    # Security Boundary: Verify Ownership
    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Execute Ultra-fast Hybrid RRF Search directly in DB (< 15ms)
    results = await hybrid_code_search(db, q, repo_uuid, top_k=15)
    return results


@router.get("/symbols", response_model=list[SearchResultItem])
async def search_symbols(
    q: str = Query(..., min_length=1),
    repository_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    stmt = (
        select(CodeSymbol, RepositoryFile)
        .join(RepositoryFile, CodeSymbol.file_id == RepositoryFile.id)
        .where(RepositoryFile.repository_id == repo_uuid)
        .where(CodeSymbol.symbol_name.ilike(f"%{q}%"))
        .limit(20)
    )

    db_results = await db.execute(stmt)
    items = []
    for sym, repo_file in db_results:
        items.append(
            {
                "file_path": repo_file.file_path,
                "match_type": "symbol",
                "snippet": f"{sym.symbol_type}: {sym.symbol_name} (Lines {sym.line_start}-{sym.line_end})",
                "score": 1.0,
            }
        )

    return items
