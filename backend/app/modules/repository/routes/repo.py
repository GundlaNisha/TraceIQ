from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from urllib.parse import urlparse
from app.db.session import get_db
from app.core.deps import get_current_user
from app.modules.auth.models.user import User
from app.modules.repository.schemas.repo import RepoCreate, RepoResponse
from app.modules.repository.models.repo import Repository
from app.workers.repo_sync import sync_repository
import uuid

router = APIRouter(prefix="/api/v1/repositories", tags=["repositories"])

@router.get("/", response_model=list[RepoResponse])
async def list_repositories(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Repository).where(Repository.user_id == current_user.id))
    return result.scalars().all()

@router.post("/", response_model=RepoResponse, status_code=201)
async def add_repository(body: RepoCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    url_str = str(body.repo_url)
    parsed = urlparse(url_str)
    name = parsed.path.strip("/").split("/")[-1]
    if name.endswith(".git"):
        name = name[:-4]
        
    repo = Repository(
        user_id=current_user.id,
        name=name,
        repo_url=url_str
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
    
    sync_repository.delay(str(repo.id), str(current_user.id))
    return repo

@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repository(repo_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")
        
    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

@router.delete("/{repo_id}", status_code=204)
async def delete_repository(repo_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")
        
    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    await db.delete(repo)
    await db.commit()
    return None

@router.post("/{repo_id}/sync", status_code=202)
async def trigger_sync(repo_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")
        
    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    sync_repository.delay(repo_id, str(current_user.id))
    return {"job": "queued"}
