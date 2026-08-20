import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRReview, PRReviewFinding
from app.modules.review.schemas.rev_schemas import (
    PRReviewCreate,
    PRReviewFindingResponse,
    PRReviewResponse,
)
from app.workers.pr_review import run_pr_review

router = APIRouter(prefix="/api/v1/pr-reviews", tags=["pr-reviews"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_pr_review(
    body: PRReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an AI PR review job for a GitHub Pull Request."""
    # Verify repository ownership
    repo = await db.get(Repository, body.repository_id)
    if not repo:
        raise NotFoundError("Repository not found")
    if repo.user_id != current_user.id:
        raise ForbiddenError("Not authorized to review this repository")

    # Verify requirement ownership if provided
    if body.requirement_id:
        req = await db.get(Requirement, body.requirement_id)
        if not req:
            raise NotFoundError("Requirement not found")
        if req.user_id != current_user.id:
            raise ForbiddenError("Not authorized to use this requirement")

    pr_review = PRReview(
        user_id=current_user.id,
        repository_id=body.repository_id,
        pr_number=body.pr_number,
        pr_title=body.pr_title,
        pr_html_url=body.pr_html_url,
        requirement_id=body.requirement_id,
        status="queued",
    )
    db.add(pr_review)
    await db.commit()
    await db.refresh(pr_review)

    # Enqueue Celery worker
    run_pr_review.delay(str(pr_review.id))

    return {"id": str(pr_review.id)}


@router.get("", response_model=list[PRReviewResponse])
async def list_pr_reviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all PR reviews for the current user."""
    result = await db.execute(
        select(PRReview)
        .where(PRReview.user_id == current_user.id)
        .order_by(desc(PRReview.created_at))
    )
    return result.scalars().all()


@router.get("/{review_id}", response_model=PRReviewResponse)
async def get_pr_review(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single PR review by ID."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    result = await db.execute(select(PRReview).where(PRReview.id == review_uuid))
    pr_review = result.scalar_one_or_none()
    if not pr_review:
        raise NotFoundError("PR review not found")
    if pr_review.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this PR review")
    return pr_review


@router.get("/{review_id}/findings", response_model=list[PRReviewFindingResponse])
async def get_pr_review_findings(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all AI findings for a specific PR review."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    # Verify ownership
    result = await db.execute(select(PRReview).where(PRReview.id == review_uuid))
    pr_review = result.scalar_one_or_none()
    if not pr_review:
        raise NotFoundError("PR review not found")
    if pr_review.user_id != current_user.id:
        raise ForbiddenError("Not authorized to view this PR review")

    findings_res = await db.execute(
        select(PRReviewFinding).where(PRReviewFinding.pr_review_id == review_uuid)
    )
    return findings_res.scalars().all()


@router.post("/{review_id}/post-comment")
async def post_review_comment_to_github(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually post / comment this PR review content directly to the GitHub PR."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    pr_review = await db.get(PRReview, review_uuid)
    if not pr_review:
        raise NotFoundError("PR review not found")
    if pr_review.user_id != current_user.id:
        raise ForbiddenError("Not authorized to post comments for this review")
    if pr_review.status != "completed":
        raise HTTPException(status_code=400, detail="Review is not completed yet")

    repo = await db.get(Repository, pr_review.repository_id)
    if not repo:
        raise NotFoundError("Repository not found")

    import logging

    from app.modules.github.models.installation import GithubInstallation
    from app.modules.github.services.auth import (
        get_installation_id_for_repo,
        get_installation_token,
    )
    from app.workers.pr_review import _extract_full_name, _post_pr_review_to_github

    logger = logging.getLogger(__name__)

    repo_full_name = _extract_full_name(repo)
    token = None
    if repo.github_installation_id:
        try:
            token = get_installation_token(repo.github_installation_id)
        except Exception as exc:
            logger.warning(
                f"Could not get installation token for repo {repo.id}: {exc!s}"
            )

    if not token and repo_full_name:
        inst_id = get_installation_id_for_repo(repo_full_name)
        if inst_id:
            try:
                token = get_installation_token(inst_id)
                # Ensure GithubInstallation record exists first to satisfy foreign key constraint
                inst_check = await db.execute(
                    select(GithubInstallation).where(
                        GithubInstallation.installation_id == inst_id
                    )
                )
                inst_rec = inst_check.scalar_one_or_none()
                if not inst_rec:
                    parts = [p for p in repo_full_name.strip("/").split("/") if p]
                    account_name = parts[0] if parts else "github-user"
                    inst_rec = GithubInstallation(
                        user_id=current_user.id,
                        installation_id=inst_id,
                        account_name=account_name,
                    )
                    db.add(inst_rec)
                    await db.flush()

                repo.github_installation_id = inst_id
                await db.commit()
                logger.info(
                    f"Discovered and linked GitHub App installation {inst_id} for repo {repo_full_name}"
                )
            except Exception as exc:
                await db.rollback()
                logger.warning(
                    f"Could not persist discovered installation {inst_id}: {exc!s}"
                )

    if not token:
        inst_res = await db.execute(
            select(GithubInstallation).where(
                GithubInstallation.user_id == current_user.id
            )
        )
        inst = inst_res.scalar_one_or_none()
        if inst:
            try:
                token = get_installation_token(inst.installation_id)
            except Exception as exc:
                logger.warning(
                    f"Could not get user installation token {inst.installation_id}: {exc!s}"
                )

    if not token:
        raise HTTPException(
            status_code=400,
            detail="No active GitHub App installation found for this repository. Please ensure the GitHub App is installed on this repository.",
        )

    findings_res = await db.execute(
        select(PRReviewFinding).where(PRReviewFinding.pr_review_id == review_uuid)
    )
    findings = findings_res.scalars().all()

    await _post_pr_review_to_github(
        repo_full_name=repo_full_name,
        pr_number=pr_review.pr_number,
        token=token,
        summary=pr_review.summary or "PR review completed.",
        findings=findings,
    )

    return {"success": True, "message": "PR review successfully commented on GitHub!"}
