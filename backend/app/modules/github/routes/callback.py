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

@router.get("/callback")
async def github_app_callback(
    installation_id: int = Query(...),
    setup_action: str = Query(...),
    state: str = Query(..., description="The user ID passed in the OAuth state parameter"),
    db: AsyncSession = Depends(get_db)
):
    """
    Callback for GitHub App Installation.
    GitHub redirects here after a user installs the app on their account/organization.
    """
    user_id = state
    
    if setup_action not in ["install", "update"]:
        raise HTTPException(status_code=400, detail="Invalid setup action")
        
    # Get the installation access token to fetch details
    try:
        token = get_installation_token(installation_id)
    except Exception as e:
        logger.error(f"Failed to generate installation token: {e!s}")
        raise HTTPException(status_code=500, detail="Failed to authenticate with GitHub")
        
    # Fetch installation details to get account name (Requires App JWT, not installation token)
    try:
        integration = get_github_integration()
        jwt_token = integration.create_jwt()
    except Exception as e:
        logger.error(f"Failed to generate JWT: {e!s}")
        raise HTTPException(status_code=500, detail="Failed to authenticate App with GitHub")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/app/installations/{installation_id}",
            headers={
                "Authorization": f"Bearer {jwt_token}",
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        )
        if response.status_code != 200:
            logger.error(f"Failed to fetch installation details: {response.text}")
            raise HTTPException(status_code=500, detail="Failed to fetch installation details")
            
        data = response.json()
        account_name = data.get("account", {}).get("login", "Unknown")
        
    # Upsert the GithubInstallation record
    result = await db.execute(
        select(GithubInstallation).where(GithubInstallation.installation_id == installation_id)
    )
    installation = result.scalar_one_or_none()
    
    if installation:
        installation.account_name = account_name
        installation.user_id = user_id
    else:
        installation = GithubInstallation(
            installation_id=installation_id,
            account_name=account_name,
            user_id=user_id
        )
        db.add(installation)
        
    # Fetch repositories accessible by this installation
    async with httpx.AsyncClient() as client:
        repos_response = await client.get(
            "https://api.github.com/installation/repositories",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        )
        
        if repos_response.status_code == 200:
            repos_data = repos_response.json().get("repositories", [])
            for repo_data in repos_data:
                # Upsert repository
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
                else:
                    new_repo = Repository(
                        user_id=user_id,
                        name=repo_name,
                        repo_url=repo_url,
                        default_branch=default_branch,
                        github_installation_id=installation_id,
                        is_private=is_private,
                        sync_status="pending"
                    )
                    db.add(new_repo)
                    
    await db.commit()

    # Redirect back to the frontend repositories page
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{settings.frontend_url}/repositories")

@router.get("/status")
async def get_github_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GithubInstallation).where(GithubInstallation.user_id == current_user.id)
    )
    installation = result.scalar_one_or_none()
    
    return {"connected": installation is not None}

@router.delete("/disconnect")
async def disconnect_github(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GithubInstallation).where(GithubInstallation.user_id == current_user.id)
    )
    installation = result.scalar_one_or_none()
    
    if not installation:
        raise HTTPException(status_code=404, detail="GitHub not connected")
        
    await db.delete(installation)
    
    # We optionally can also remove github_installation_id from repos
    from sqlalchemy import update

    from app.modules.repository.models.repo import Repository
    await db.execute(
        update(Repository)
        .where(Repository.github_installation_id == installation.installation_id)
        .values(github_installation_id=None)
    )
    
    await db.commit()
    return {"message": "Disconnected successfully"}
