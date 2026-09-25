"""CI checks endpoint: live GitHub Actions status per PR.

GET /api/v1/github/pull-requests/checks?repo_id=<uuid>&pr_number=<int>

Returns a normalized summary (never 500s on GitHub errors — the UI badge
must degrade to "unknown" instead of breaking the PR list).
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.github.models.installation import GithubInstallation
from app.modules.github.routes.prs import _extract_full_name
from app.modules.github.services.auth import get_installation_token
from app.modules.github.services.checks import (
    correlate_ci_with_blast_radius,
    fetch_pr_checks,
    fetch_repo_actions,
    summarize_checks,
    summarize_workflow_runs,
)
from app.modules.impact.models.impact import AnalysisJob, ImpactResult
from app.modules.repository.models.repo import Repository
from app.modules.review.models.rev_models import PRReview
from app.modules.workspace.models.workspace import WorkspaceMember

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/github/pull-requests", tags=["github-ci"])


@router.get("/checks")
async def get_pr_checks(
    repo_id: uuid.UUID,
    pr_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Normalized CI summary for one PR's head SHA."""
    repo = await db.get(Repository, repo_id)
    if not repo:
        return summarize_checks([])

    # Auth: owner or workspace member (same rule as PR list endpoint)
    is_owner = repo.user_id == current_user.id
    if not is_owner:
        if not repo.workspace_id:
            return summarize_checks([])
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == repo.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            return summarize_checks([])

    full_name = _extract_full_name(repo)
    if not full_name or "/" not in full_name:
        return summarize_checks([])

    token: str | None = None
    try:
        inst_res = await db.execute(
            select(GithubInstallation).where(
                GithubInstallation.user_id == current_user.id
            )
        )
        installation = inst_res.scalar_one_or_none()
        installation_id = (
            repo.github_installation_id
            or (installation.installation_id if installation else None)
        )
        if installation_id:
            token = get_installation_token(installation_id)
    except Exception as e:
        logger.warning(f"Could not resolve installation token: {e!s}")

    return await fetch_pr_checks(full_name, pr_number, token)


@router.get("/actions")
async def get_repo_actions(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recent GitHub Actions runs + health stats for one repo.

    Degrades to an empty summary on auth or GitHub errors so the
    dashboard panel renders a neutral empty state instead of failing.
    """
    empty = summarize_workflow_runs([])

    repo = await db.get(Repository, repo_id)
    if not repo:
        return empty

    is_owner = repo.user_id == current_user.id
    if not is_owner:
        if not repo.workspace_id:
            return empty
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == repo.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            return empty

    full_name = _extract_full_name(repo)
    if not full_name or "/" not in full_name:
        return empty

    token: str | None = None
    try:
        inst_res = await db.execute(
            select(GithubInstallation).where(
                GithubInstallation.user_id == current_user.id
            )
        )
        installation = inst_res.scalar_one_or_none()
        installation_id = (
            repo.github_installation_id
            or (installation.installation_id if installation else None)
        )
        if installation_id:
            token = get_installation_token(installation_id)
    except Exception as e:
        logger.warning(f"Could not resolve installation token: {e!s}")

    return await fetch_repo_actions(full_name, token)


@router.get("/ci-correlation")
async def get_ci_correlation(
    review_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Correlate failing CI checks with the review's blast-radius files.

    verdict "clean" (CI green) | "in_scope" (failure overlaps impacted
    files) | "unrelated" (failure outside predicted impact).
    """
    review = await db.get(PRReview, review_id)
    if not review:
        return {
            "ci": summarize_checks([]),
            "impacted_files": [],
            "correlation": {"verdict": "clean", "in_blast_radius": [], "unrelated": []},
        }

    repo = await db.get(Repository, review.repository_id)
    if not repo:
        return {
            "ci": summarize_checks([]),
            "impacted_files": [],
            "correlation": {"verdict": "clean", "in_blast_radius": [], "unrelated": []},
        }

    # Same view rule as the review detail endpoint: owner or member.
    is_owner = repo.user_id == current_user.id
    if not is_owner:
        if not repo.workspace_id:
            return {
                "ci": summarize_checks([]),
                "impacted_files": [],
                "correlation": {"verdict": "clean", "in_blast_radius": [], "unrelated": []},
            }
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == repo.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            return {
                "ci": summarize_checks([]),
                "impacted_files": [],
                "correlation": {"verdict": "clean", "in_blast_radius": [], "unrelated": []},
            }

    full_name = _extract_full_name(repo)
    token: str | None = None
    try:
        inst_res = await db.execute(
            select(GithubInstallation).where(
                GithubInstallation.user_id == current_user.id
            )
        )
        installation = inst_res.scalar_one_or_none()
        installation_id = (
            repo.github_installation_id
            or (installation.installation_id if installation else None)
        )
        if installation_id:
            token = get_installation_token(installation_id)
    except Exception as e:
        logger.warning(f"Could not resolve installation token: {e!s}")

    ci = (
        await fetch_pr_checks(full_name, review.pr_number, token)
        if full_name and "/" in full_name
        else summarize_checks([])
    )

    impacted_files: list[dict] = []
    if review.requirement_id:
        impact_q = await db.execute(
            select(ImpactResult)
            .join(AnalysisJob, ImpactResult.job_id == AnalysisJob.id)
            .where(
                AnalysisJob.requirement_id == review.requirement_id,
                AnalysisJob.repository_id == review.repository_id,
                AnalysisJob.status == "completed",
            )
            .order_by(AnalysisJob.created_at.desc())
            .limit(1)
        )
        impact_rec = impact_q.scalar_one_or_none()
        if impact_rec and impact_rec.impacted_files:
            for f in impact_rec.impacted_files.get("files", []):
                impacted_files.append(
                    {
                        "file_path": f.get("file_path", ""),
                        "confidence": f.get("confidence"),
                        "risk_level": f.get("risk_level", "medium"),
                    }
                )

    correlation = correlate_ci_with_blast_radius(
        ci.get("checks", []), impacted_files
    )
    return {"ci": ci, "impacted_files": impacted_files, "correlation": correlation}
