import os
import tarfile
import tempfile
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.indexing.models.index_models import CodeSymbol, RepositoryFile
from app.modules.repository.models.repo import Repository, RepositorySnapshot
from app.modules.retrieval.schemas.search_schemas import SearchResultItem
from app.modules.retrieval.services.ripgrep import ripgrep_search
from app.modules.retrieval.services.semantic import semantic_search

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
        
    # 1. Get AI Semantic Results (Vector Search)
    results = await semantic_search(db, q, repo_uuid)
    
    # 2. Get Exact Keyword Results (Ripgrep)
    result_snap = await db.execute(
        select(RepositorySnapshot)
        .where(RepositorySnapshot.repository_id == repo_uuid)
        .order_by(RepositorySnapshot.created_at.desc())
        .limit(1)
    )
    snapshot = result_snap.scalar_one_or_none()
    
    if snapshot:
        snapshot_dir = settings.snapshot_dir
        tar_path = os.path.join(snapshot_dir, snapshot.storage_key)
        if not os.path.exists(tar_path):
            tar_path = os.path.join("backend", snapshot_dir, snapshot.storage_key)
            
        if os.path.exists(tar_path):
            # Temporarily extract the repo to run ripgrep
            with tempfile.TemporaryDirectory() as tmpdir:
                try:
                    with tarfile.open(tar_path, "r:gz") as tar:
                        tar.extractall(path=tmpdir, filter="data")
                    rg_results = ripgrep_search(q, tmpdir)
                    # Limit ripgrep to top 5 so it doesn't push out all our AI Semantic results!
                    results.extend(rg_results[:5])
                except (tarfile.TarError, OSError):
                    pass
                
    # Sort combined results by score desc
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:15]

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
        
    # Security Boundary: Verify Ownership
    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Query the Tree-sitter CodeSymbol table directly!
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
        # Strip the random temp directory root (e.g. 'tmpb5t11okc/...')
        path_parts = repo_file.file_path.split("/", 1)
        clean_path = path_parts[1] if len(path_parts) > 1 else repo_file.file_path
        
        items.append({
            "file_path": clean_path,
            "match_type": "symbol",
            "snippet": f"{sym.symbol_type}: {sym.symbol_name} (Lines {sym.line_start}-{sym.line_end})",
            "score": 1.0
        })
        
    return items
