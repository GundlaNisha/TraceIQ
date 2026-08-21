import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.github.models.installation import GithubInstallation
from app.modules.github.services.auth import (
    get_github_integration,
    get_installation_token,
)
from app.modules.repository.models.repo import Repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/github", tags=["github"])


async def _resolve_user_installation(
    db: AsyncSession, current_user_id: str
) -> GithubInstallation | None:
    """Helper to find or auto-link a GitHub installation for the user."""
    # 1. Direct match by user_id
    result = await db.execute(
        select(GithubInstallation).where(GithubInstallation.user_id == current_user_id)
    )
    installation = result.scalar_one_or_none()
    if installation:
        return installation

    # 2. Check if user owns any repository with github_installation_id
    repo_res = await db.execute(
        select(Repository.github_installation_id)
        .where(
            Repository.user_id == current_user_id,
            Repository.github_installation_id.isnot(None),
        )
        .limit(1)
    )
    found_inst_id = repo_res.scalar_one_or_none()
    if found_inst_id:
        inst_res = await db.execute(
            select(GithubInstallation).where(
                GithubInstallation.installation_id == found_inst_id
            )
        )
        installation = inst_res.scalar_one_or_none()
        if installation:
            installation.user_id = current_user_id
            await db.commit()
            return installation

    # 3. If there's any single installation in the system without user_id, auto-link it
    any_inst_res = await db.execute(select(GithubInstallation).limit(1))
    any_inst = any_inst_res.scalar_one_or_none()
    if any_inst and (not any_inst.user_id or any_inst.user_id == current_user_id):
        any_inst.user_id = current_user_id
        await db.commit()
        return any_inst

    return None


@router.get("/callback")
async def github_app_callback(
    installation_id: int = Query(...),
    setup_action: str | None = Query(None),
    state: str | None = Query(None, description="The user ID passed in OAuth state"),
    db: AsyncSession = Depends(get_db),
):
    """
    Callback for GitHub App Installation.
    GitHub redirects here after a user installs or updates the app on their account.
    """
    # Fetch installation details to get account name
    try:
        integration = get_github_integration()
        jwt_token = integration.create_jwt()
    except Exception as e:
        logger.error(f"Failed to generate JWT: {e!s}")
        raise HTTPException(
            status_code=500, detail="Failed to authenticate App with GitHub"
        )

    account_name = "Unknown"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/app/installations/{installation_id}",
            headers={
                "Authorization": f"Bearer {jwt_token}",
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if response.status_code == 200:
            data = response.json()
            account_name = data.get("account", {}).get("login", "Unknown")

    # If state is missing, fallback to single user or existing installation user
    user_id = state
    if not user_id:
        existing = await db.execute(
            select(GithubInstallation).where(
                GithubInstallation.installation_id == installation_id
            )
        )
        ex_inst = existing.scalar_one_or_none()
        if ex_inst and ex_inst.user_id:
            user_id = ex_inst.user_id
        else:
            first_user = await db.execute(select(User).limit(1))
            u = first_user.scalar_one_or_none()
            if u:
                user_id = str(u.id)

    # Upsert GithubInstallation
    result = await db.execute(
        select(GithubInstallation).where(
            GithubInstallation.installation_id == installation_id
        )
    )
    installation = result.scalar_one_or_none()

    if installation:
        installation.account_name = account_name
        if user_id:
            installation.user_id = user_id
    else:
        if not user_id:
            # Fallback to single user if none provided
            first_user = await db.execute(select(User).limit(1))
            u = first_user.scalar_one_or_none()
            user_id = str(u.id) if u else "unknown"

        installation = GithubInstallation(
            installation_id=installation_id, account_name=account_name, user_id=user_id
        )
        db.add(installation)

    # Sync repositories accessible by this installation
    try:
        token = get_installation_token(installation_id)
        async with httpx.AsyncClient() as client:
            repos_response = await client.get(
                "https://api.github.com/installation/repositories",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github.v3+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )

            if repos_response.status_code == 200:
                repos_data = repos_response.json().get("repositories", [])
                for repo_data in repos_data:
                    repo_url = repo_data.get("html_url")
                    repo_name = repo_data.get("full_name")
                    default_branch = repo_data.get("default_branch", "main")
                    is_private = repo_data.get("private", False)

                    repo_result = await db.execute(
                        select(Repository).where(Repository.repo_url == repo_url)
                    )
                    existing_repo = repo_result.scalar_one_or_none()

                    if existing_repo:
                        existing_repo.github_installation_id = installation_id
                        existing_repo.is_private = is_private
                        if user_id and not existing_repo.user_id:
                            existing_repo.user_id = user_id
                    elif user_id:
                        new_repo = Repository(
                            user_id=user_id,
                            name=repo_name,
                            repo_url=repo_url,
                            default_branch=default_branch,
                            github_installation_id=installation_id,
                            is_private=is_private,
                            sync_status="pending",
                        )
                        db.add(new_repo)
    except Exception as exc:
        logger.warning(f"Failed to auto-sync repos during callback: {exc!s}")

    await db.commit()

    from fastapi.responses import RedirectResponse

    return RedirectResponse(url=f"{settings.frontend_url}/repositories")


@router.post("/link-installation")
async def link_installation(
    installation_id: int = Query(..., description="GitHub Installation ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually link a known GitHub Installation ID (e.g. 153250411) to the current user.
    """
    try:
        integration = get_github_integration()
        jwt_token = integration.create_jwt()
    except Exception as e:
        logger.error(f"Failed to generate JWT: {e!s}")
        raise HTTPException(
            status_code=500, detail="Failed to authenticate App with GitHub"
        )

    account_name = "Unknown"
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/app/installations/{installation_id}",
            headers={
                "Authorization": f"Bearer {jwt_token}",
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if response.status_code == 200:
            data = response.json()
            account_name = data.get("account", {}).get("login", "Unknown")

    result = await db.execute(
        select(GithubInstallation).where(
            GithubInstallation.installation_id == installation_id
        )
    )
    installation = result.scalar_one_or_none()

    if installation:
        installation.account_name = account_name
        installation.user_id = current_user.id
    else:
        installation = GithubInstallation(
            installation_id=installation_id,
            account_name=account_name,
            user_id=current_user.id,
        )
        db.add(installation)

    await db.commit()
    return {
        "success": True,
        "installation_id": installation_id,
        "account_name": account_name,
        "message": f"Successfully linked GitHub account @{account_name}",
    }


@router.get("/status")
async def get_github_status(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    installation = await _resolve_user_installation(db, current_user.id)

    if not installation:
        app_name = settings.github_app_name or "traceiq-official"
        return {
            "connected": False,
            "installation_id": None,
            "account_name": None,
            "settings_url": f"https://github.com/apps/{app_name}/installations/new",
        }

    return {
        "connected": True,
        "installation_id": installation.installation_id,
        "account_name": installation.account_name,
        "settings_url": f"https://github.com/settings/installations/{installation.installation_id}",
    }


@router.get("/available-repositories")
async def get_available_repositories(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    installation = await _resolve_user_installation(db, current_user.id)
    if not installation:
        return {"connected": False, "repositories": []}

    try:
        token = get_installation_token(installation.installation_id)
    except Exception as exc:
        logger.error(
            f"Failed to get token for installation {installation.installation_id}: {exc!s}"
        )
        return {
            "connected": True,
            "repositories": [],
            "error": "Failed to authenticate with GitHub App",
        }

    # Fetch accessible repos from GitHub
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://api.github.com/installation/repositories?per_page=100",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if response.status_code != 200:
            logger.error(
                f"GitHub API returned {response.status_code}: {response.text[:200]}"
            )
            return {"connected": True, "repositories": [], "error": "GitHub API error"}

        gh_data = response.json()
        gh_repos = gh_data.get("repositories", [])

    # Fetch imported repos for this user
    user_repos_res = await db.execute(
        select(Repository).where(Repository.user_id == current_user.id)
    )
    imported_urls = {
        r.repo_url.lower().rstrip("/") for r in user_repos_res.scalars().all()
    }

    repositories = []
    for r in gh_repos:
        html_url = r.get("html_url", "")
        is_imported = html_url.lower().rstrip("/") in imported_urls

        repositories.append(
            {
                "id": r.get("id"),
                "name": r.get("name"),
                "full_name": r.get("full_name"),
                "html_url": html_url,
                "private": r.get("private", False),
                "default_branch": r.get("default_branch", "main"),
                "description": r.get("description"),
                "is_imported": is_imported,
            }
        )

    return {
        "connected": True,
        "account_name": installation.account_name,
        "installation_id": installation.installation_id,
        "total_count": len(repositories),
        "settings_url": f"https://github.com/settings/installations/{installation.installation_id}",
        "repositories": repositories,
    }


@router.delete("/disconnect")
async def disconnect_github(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    installation = await _resolve_user_installation(db, current_user.id)

    if not installation:
        raise HTTPException(status_code=404, detail="GitHub not connected")

    await db.delete(installation)

    from sqlalchemy import update

    await db.execute(
        update(Repository)
        .where(Repository.github_installation_id == installation.installation_id)
        .values(github_installation_id=None)
    )

    await db.commit()
    return {"message": "Disconnected successfully"}
