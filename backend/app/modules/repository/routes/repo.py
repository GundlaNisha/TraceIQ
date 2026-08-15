import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.repository.models.repo import Repository
from app.modules.repository.schemas.repo import RepoCreate, RepoResponse
from app.workers.repo_sync import sync_repository

router = APIRouter(prefix="/api/v1/repositories", tags=["repositories"])


@router.get("", response_model=list[RepoResponse])
async def list_repositories(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Repository).where(Repository.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("", response_model=RepoResponse, status_code=201)
async def add_repository(
    body: RepoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    url_str = str(body.repo_url)
    parsed = urlparse(url_str)
    name = parsed.path.strip("/").split("/")[-1]
    name = name.removesuffix(".git")

    repo = Repository(user_id=current_user.id, name=name, repo_url=url_str)
    db.add(repo)
    await db.commit()
    await db.refresh(repo)

    sync_repository.delay(str(repo.id), str(current_user.id))
    return repo


@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repository(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


@router.delete("/{repo_id}", status_code=204)
async def delete_repository(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    await db.delete(repo)
    await db.commit()


@router.post("/{repo_id}/sync", status_code=202)
async def trigger_sync(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.audit.models.audit import AuditLog

    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    audit = AuditLog(
        user_id=str(current_user.id),
        action="repo.sync",
        resource_type="repository",
        resource_id=repo_id,
    )
    db.add(audit)
    await db.commit()

    sync_repository.delay(repo_id, str(current_user.id))
    return {"job": "queued"}


@router.post("/{repo_id}/index", status_code=202)
async def trigger_index(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.repository.models.repo import RepositorySnapshot
    from app.workers.repo_index import index_repository

    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Get latest snapshot
    result = await db.execute(
        select(RepositorySnapshot)
        .where(RepositorySnapshot.repository_id == repo_uuid)
        .order_by(RepositorySnapshot.created_at.desc())
        .limit(1)
    )
    snapshot = result.scalar_one_or_none()

    if not snapshot:
        raise HTTPException(
            status_code=400, detail="Repository has not been synced yet"
        )

    index_repository.delay(str(repo_uuid), str(snapshot.id))
    return {"job": "indexing_queued"}
