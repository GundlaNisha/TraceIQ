import asyncio

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.github.models.installation import GithubInstallation
from app.modules.github.services.auth import get_installation_token
from app.modules.repository.models.repo import Repository

router = APIRouter(prefix="/api/v1/github/pull-requests", tags=["github-prs"])


async def fetch_repo_prs(client: httpx.AsyncClient, repo_name: str, token: str):
    response = await client.get(
        f"https://api.github.com/repos/{repo_name}/pulls?state=open",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    if response.status_code == 200:
        return response.json()
    return []


@router.get("")
async def get_github_pull_requests(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    # Get installation
    result = await db.execute(
        select(GithubInstallation).where(GithubInstallation.user_id == current_user.id)
    )
    installation = result.scalar_one_or_none()

    if not installation:
        return []

    # Get all repos tracked by user
    repo_result = await db.execute(
        select(Repository).where(Repository.user_id == current_user.id)
    )
    repos = repo_result.scalars().all()

    if not repos:
        return []

    try:
        token = get_installation_token(installation.installation_id)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to get GitHub token")

    # Fetch PRs concurrently
    async with httpx.AsyncClient() as client:
        tasks = []
        for repo in repos:
            # repo.name stores full_name like "owner/repo" or just "repo"
            # But wait! For github apps, repo.name in DB is "owner/repo" as set by callback.py
            # If they added it manually, it might just be "repo". Let's handle it safely.
            full_name = repo.name
            if "/" not in full_name and installation.account_name:
                full_name = f"{installation.account_name}/{full_name}"
            tasks.append(fetch_repo_prs(client, full_name, token))

        results = await asyncio.gather(*tasks)

    # Flatten and format
    all_prs = []
    for pr_list in results:
        for pr in pr_list:
            all_prs.append(
                {
                    "id": str(pr.get("id")),
                    "number": pr.get("number"),
                    "title": pr.get("title"),
                    "state": pr.get("state"),
                    "html_url": pr.get("html_url"),
                    "created_at": pr.get("created_at"),
                    "updated_at": pr.get("updated_at"),
                    "draft": pr.get("draft", False),
                    "repository_url": pr.get("base", {})
                    .get("repo", {})
                    .get("html_url"),
                    "repository_name": pr.get("base", {})
                    .get("repo", {})
                    .get("full_name"),
                    "user": {
                        "login": pr.get("user", {}).get("login"),
                        "avatar_url": pr.get("user", {}).get("avatar_url"),
                    },
                }
            )

    # Sort by updated_at descending
    all_prs.sort(key=lambda x: x["updated_at"], reverse=True)
    return all_prs
