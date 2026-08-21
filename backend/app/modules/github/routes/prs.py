import asyncio
import logging
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.github.models.installation import GithubInstallation
from app.modules.github.services.auth import get_installation_token
from app.modules.repository.models.repo import Repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/github/pull-requests", tags=["github-prs"])


def _extract_full_name(repo: Repository) -> str:
    """Extract 'owner/repo' from repository name or URL."""
    if repo.name and "/" in repo.name:
        return repo.name.strip("/")

    if repo.repo_url:
        parsed = urlparse(repo.repo_url)
        path = parsed.path.strip("/")
        path = path.removesuffix(".git")
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2:
            return f"{parts[-2]}/{parts[-1]}"
        if len(parts) == 1:
            return parts[0]

    return repo.name or ""


async def fetch_repo_prs(
    client: httpx.AsyncClient, full_name: str, token: str | None
) -> list[dict]:
    if not full_name or "/" not in full_name:
        return []

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = await client.get(
            f"https://api.github.com/repos/{full_name}/pulls?state=all&per_page=50",
            headers=headers,
            timeout=15.0,
        )
        if response.status_code == 200:
            return response.json()
        logger.warning(
            f"GitHub API {response.status_code} fetching PRs for {full_name}: {response.text[:200]}"
        )
    except Exception as e:
        logger.warning(f"Error fetching PRs for {full_name}: {e!s}")

    return []


@router.get("")
async def get_github_pull_requests(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    # 1. Fetch user's GitHub installation if one exists
    inst_result = await db.execute(
        select(GithubInstallation).where(GithubInstallation.user_id == current_user.id)
    )
    user_installation = inst_result.scalar_one_or_none()

    # 2. Get all repositories tracked by user
    repo_result = await db.execute(
        select(Repository).where(Repository.user_id == current_user.id)
    )
    repos = repo_result.scalars().all()

    if not repos:
        return []

    # 3. Resolve installation token if available
    default_token = None
    if user_installation:
        try:
            default_token = get_installation_token(user_installation.installation_id)
        except Exception as e:
            logger.warning(
                f"Could not generate installation token for installation {user_installation.installation_id}: {e!s}"
            )

    # 4. Fetch PRs concurrently for all repositories
    async with httpx.AsyncClient() as client:
        tasks = []
        for repo in repos:
            full_name = _extract_full_name(repo)
            repo_token = default_token
            if repo.github_installation_id and repo.github_installation_id != (
                user_installation.installation_id if user_installation else None
            ):
                try:
                    repo_token = get_installation_token(repo.github_installation_id)
                except Exception:
                    repo_token = default_token

            tasks.append(fetch_repo_prs(client, full_name, repo_token))

        results = await asyncio.gather(*tasks)

    # 5. Flatten and format PR list
    all_prs = []
    for pr_list in results:
        for pr in pr_list:
            user_data = pr.get("user") or {}
            base_data = pr.get("base") or {}
            repo_data = base_data.get("repo") or {}

            # Detect if PR was merged vs closed
            raw_state = pr.get("state", "open")
            is_merged = bool(pr.get("merged_at"))
            state = "merged" if is_merged else raw_state

            all_prs.append(
                {
                    "id": str(pr.get("id")),
                    "number": pr.get("number"),
                    "title": pr.get("title", ""),
                    "state": state,
                    "merged_at": pr.get("merged_at"),
                    "closed_at": pr.get("closed_at"),
                    "html_url": pr.get("html_url", ""),
                    "created_at": pr.get("created_at"),
                    "updated_at": pr.get("updated_at"),
                    "draft": bool(pr.get("draft", False)),
                    "repository_url": repo_data.get("html_url", ""),
                    "repository_name": repo_data.get("full_name", ""),
                    "user": {
                        "login": user_data.get("login", "Unknown"),
                        "avatar_url": user_data.get("avatar_url"),
                    },
                }
            )

    # Sort by updated_at descending
    all_prs.sort(key=lambda x: x["updated_at"] or "", reverse=True)
    return all_prs
