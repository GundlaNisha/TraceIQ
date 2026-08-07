import os
import shutil
import tempfile
import tarfile
import asyncio
import uuid
import socket
from urllib.parse import urlparse
from celery.utils.log import get_task_logger
import git

from app.workers.celery_app import celery_app
from app.integrations.storage.local_client import upload_tarball
from app.db.session import AsyncSessionLocal
from app.modules.repository.models.repo import Repository, RepositorySnapshot, SyncStatus
from sqlalchemy import update

logger = get_task_logger(__name__)

def validate_url(repo_url: str):
    parsed = urlparse(repo_url)
    if parsed.hostname not in ["github.com", "gitlab.com"]:
        raise ValueError("Only github.com and gitlab.com are allowed.")
    try:
        ip = socket.gethostbyname(parsed.hostname)
        if ip.startswith("127.") or ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("169.254."):
            raise ValueError("SSRF protection: Invalid IP.")
    except Exception:
        raise ValueError("Invalid hostname.")

async def _get_repo_url(repo_id: str) -> str:
    async with AsyncSessionLocal() as session:
        repo = await session.get(Repository, uuid.UUID(repo_id))
        if not repo:
            raise ValueError("Repo not found")
        return repo.repo_url

async def _update_status(repo_id: str, status: SyncStatus):
    async with AsyncSessionLocal() as session:
        await session.execute(update(Repository).where(Repository.id == uuid.UUID(repo_id)).values(sync_status=status))
        await session.commit()

async def _create_snapshot(repo_id: str, storage_key: str, commit_sha: str):
    async with AsyncSessionLocal() as session:
        snap = RepositorySnapshot(repository_id=uuid.UUID(repo_id), storage_key=storage_key, commit_sha=commit_sha)
        session.add(snap)
        await session.commit()

async def _process_sync(repository_id: str):
    await _update_status(repository_id, SyncStatus.syncing)
    repo_url = await _get_repo_url(repository_id)
    validate_url(repo_url)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        repo = git.Repo.clone_from(repo_url, temp_dir, depth=1)
        commit_sha = repo.head.commit.hexsha
        
        # Remove .git folder
        git_dir = os.path.join(temp_dir, ".git")
        if os.path.exists(git_dir):
            shutil.rmtree(git_dir)
            
        # Create tarball
        tar_path = os.path.join(tempfile.gettempdir(), f"{repository_id}.tar.gz")
        with tarfile.open(tar_path, "w:gz") as tar:
            tar.add(temp_dir, arcname=os.path.basename(temp_dir))
            
        try:
            storage_key = f"repositories/{repository_id}/{commit_sha}.tar.gz"
            await upload_tarball(tar_path, storage_key)
            await _create_snapshot(repository_id, storage_key, commit_sha)
            await _update_status(repository_id, SyncStatus.completed)
        finally:
            if os.path.exists(tar_path):
                os.remove(tar_path)

@celery_app.task
def sync_repository(repository_id: str, user_id: str):
    try:
        asyncio.run(_process_sync(repository_id))
    except Exception as e:
        logger.error(f"Sync failed for repo {repository_id}: {str(e)}")
        asyncio.run(_update_status(repository_id, SyncStatus.failed))
