import asyncio
import os
import shutil
import socket
import tarfile
import tempfile
import uuid
from urllib.parse import urlparse

import git
from celery.utils.log import get_task_logger
from sqlalchemy import update

from app.db.session import AsyncSessionLocal
from app.integrations.storage.local_client import upload_tarball
from app.modules.repository.models.repo import (
    Repository,
    RepositorySnapshot,
    SyncStatus,
)
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)

# Private/reserved IP prefixes to block (SSRF protection)
_BLOCKED_IP_PREFIXES = (
    "127.",  # IPv4 loopback
    "10.",  # RFC-1918 private A
    "192.168.",  # RFC-1918 private C
    "169.254.",  # link-local (AWS metadata, etc.)
    "0.",  # 0.0.0.0 range
    "::1",  # IPv6 loopback
    "fc",  # IPv6 unique-local fc00::/7
    "fd",  # IPv6 unique-local fd00::/8
)
# Docker default bridge range: 172.16.0.0/12 (172.16–172.31)
_DOCKER_BRIDGE_START = 172 * (2**24) + 16 * (2**16)
_DOCKER_BRIDGE_END = 172 * (2**24) + 32 * (2**16)


def _ip_is_private(ip: str) -> bool:
    """Return True if ip resolves to a blocked private/reserved range."""
    if any(ip.startswith(prefix) for prefix in _BLOCKED_IP_PREFIXES):
        return True
    # Check 172.16.0.0/12
    parts = ip.split(".")
    if len(parts) == 4:
        try:
            packed = sum(int(p) * (256 ** (3 - i)) for i, p in enumerate(parts))
            if _DOCKER_BRIDGE_START <= packed < _DOCKER_BRIDGE_END:
                return True
        except ValueError:
            return True
    return False


def validate_url(repo_url: str) -> None:
    """Validate that repo_url is a public GitHub/GitLab HTTPS URL (SSRF guard)."""
    parsed = urlparse(repo_url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http/https URLs are allowed.")
    if parsed.hostname not in ("github.com", "gitlab.com"):
        raise ValueError("Only github.com and gitlab.com are allowed.")
    try:
        ip = socket.gethostbyname(parsed.hostname)
    except socket.gaierror as exc:
        raise ValueError(
            f"Unable to resolve hostname '{parsed.hostname}': {exc}"
        ) from exc
    if _ip_is_private(ip):
        raise ValueError(f"SSRF protection: hostname resolved to blocked IP {ip}.")


async def _get_repo(repo_id: str) -> Repository:
    async with AsyncSessionLocal() as session:
        repo = await session.get(Repository, uuid.UUID(repo_id))
        if not repo:
            raise ValueError("Repo not found")
        return repo


async def _update_status(repo_id: str, status: SyncStatus):
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(Repository)
            .where(Repository.id == uuid.UUID(repo_id))
            .values(sync_status=status)
        )
        await session.commit()


async def _create_snapshot(repo_id: str, storage_key: str, commit_sha: str):
    async with AsyncSessionLocal() as session:
        snap = RepositorySnapshot(
            repository_id=uuid.UUID(repo_id),
            storage_key=storage_key,
            commit_sha=commit_sha,
        )
        session.add(snap)
        await session.commit()


async def _process_sync(repository_id: str):
    from app.modules.github.services.auth import get_installation_token

    await _update_status(repository_id, SyncStatus.syncing)
    repo = await _get_repo(repository_id)
    repo_url = repo.repo_url

    validate_url(repo_url)

    # Inject token for GitHub App installed repos.
    # The token is embedded in the URL for git-clone auth but MUST NOT be logged.
    if repo.github_installation_id:
        token = get_installation_token(repo.github_installation_id)
        if repo_url.startswith("https://"):
            repo_url = repo_url.replace("https://", f"https://x-access-token:{token}@")
    # Keep a safe (no-token) copy for any log messages below

    with tempfile.TemporaryDirectory() as temp_dir:
        git_repo = git.Repo.clone_from(repo_url, temp_dir, depth=1)
        commit_sha = git_repo.head.commit.hexsha

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
def sync_repository(repository_id: str, user_id: str) -> None:
    try:
        asyncio.run(_process_sync(repository_id))
    except Exception as e:
        # Log without the URL (which may contain an auth token)
        logger.error(f"Sync failed for repo {repository_id}: {type(e).__name__}: {e!s}")
        asyncio.run(_update_status(repository_id, SyncStatus.failed))
