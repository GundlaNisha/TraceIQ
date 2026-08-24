import asyncio
import logging
import uuid
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
from app.modules.workspace.models.workspace import Workspace, WorkspaceMember

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
    repo_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch GitHub Pull Requests with workspace and repository metadata."""
    # 1. Fetch user's GitHub App installation
    inst_result = await db.execute(
        select(GithubInstallation).where(GithubInstallation.user_id == current_user.id)
    )
    user_installation = inst_result.scalar_one_or_none()

    base_query = (
        select(Repository, Workspace.name.label("workspace_name"))
        .outerjoin(Workspace, Repository.workspace_id == Workspace.id)
    )

    # 2. Get target repositories
    if repo_id:
        repo = await db.get(Repository, repo_id)
        if not repo:
            return []

        # Check authorization (own repo OR in a workspace user belongs to)
        is_owner = repo.user_id == current_user.id
        if not is_owner and repo.workspace_id:
            mem_res = await db.execute(
                select(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == repo.workspace_id,
                    WorkspaceMember.user_id == current_user.id,
                )
            )
            if not mem_res.scalar_one_or_none():
                return []
        elif not is_owner:
            return []

        res = await db.execute(base_query.where(Repository.id == repo_id))
        repos_with_ws = res.all()
    else:
        # Repositories owned by user OR in workspaces the user belongs to
        user_ws_subquery = select(WorkspaceMember.workspace_id).where(
            WorkspaceMember.user_id == current_user.id
        )
        repo_result = await db.execute(
            base_query.where(
                (Repository.user_id == current_user.id)
                | (Repository.workspace_id.in_(user_ws_subquery))
            )
        )
        repos_with_ws = repo_result.all()

    if not repos_with_ws:
        return []

    # 3. Resolve default installation token if available
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
        repo_contexts = []
        for repo, ws_name in repos_with_ws:
            full_name = _extract_full_name(repo)
            repo_token = default_token
            if repo.github_installation_id and (
                not user_installation
                or repo.github_installation_id != user_installation.installation_id
            ):
                try:
                    repo_token = get_installation_token(repo.github_installation_id)
                except Exception:
                    repo_token = default_token

            tasks.append(fetch_repo_prs(client, full_name, repo_token))
            repo_contexts.append((repo, ws_name))

        results = await asyncio.gather(*tasks)

    # 5. Flatten and format PR list
    all_prs = []
    for (repo, ws_name), pr_list in zip(repo_contexts, results):
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
                    "repository_id": str(repo.id),
                    "repository_url": repo_data.get("html_url", repo.repo_url),
                    "repository_name": repo_data.get("full_name", repo.name),
                    "workspace_id": str(repo.workspace_id) if repo.workspace_id else None,
                    "workspace_name": ws_name,
                    "user": {
                        "login": user_data.get("login", "Unknown"),
                        "avatar_url": user_data.get("avatar_url"),
                    },
                }
            )

    # Sort by updated_at descending
    all_prs.sort(key=lambda x: x["updated_at"] or "", reverse=True)
    return all_prs
