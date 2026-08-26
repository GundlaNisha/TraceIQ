import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_active_workspace_id, get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.github.models.installation import GithubInstallation
from app.modules.github.services.auth import (
    get_installation_id_for_repo,
    get_installation_token,
)
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRFileDiff, PRReview, PRReviewFinding
from app.modules.review.schemas.rev_schemas import (
    PRFileDiffResponse,
    PRReviewCreate,
    PRReviewFindingResponse,
    PRReviewResponse,
)
from app.modules.workspace.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.workers.pr_review import (
    _extract_full_name,
    _post_pr_review_to_github,
    run_pr_review,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pr-reviews", tags=["pr-reviews"])


async def _has_repo_view_access(
    db: AsyncSession, repo: Repository, current_user: User
) -> bool:
    if repo.user_id == current_user.id:
        return True
    if repo.workspace_id:
        res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == repo.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        return res.scalar_one_or_none() is not None
    return False


async def _has_repo_action_access(
    db: AsyncSession, repo: Repository, current_user: User
) -> bool:
    if repo.user_id == current_user.id:
        return True
    if repo.workspace_id:
        res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == repo.workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        mem = res.scalar_one_or_none()
        return mem is not None and mem.role != WorkspaceRole.viewer
    return False


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_pr_review(
    body: PRReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an AI PR review job for a GitHub Pull Request."""
    repo = await db.get(Repository, body.repository_id)
    if not repo:
        raise NotFoundError("Repository not found")

    can_action = await _has_repo_action_access(db, repo, current_user)
    if not can_action:
        raise ForbiddenError(
            "Not authorized to review this repository (viewers have read-only access)"
        )

    # Verify requirement access if provided
    if body.requirement_id:
        req = await db.get(Requirement, body.requirement_id)
        if not req:
            raise NotFoundError("Requirement not found")
        # Check requirement matches user or workspace
        is_req_owner = req.user_id == current_user.id
        is_req_ws = req.workspace_id and req.workspace_id == repo.workspace_id
        if not is_req_owner and not is_req_ws:
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
    request: Request,
    repo_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all PR reviews for accessible repositories or active workspace."""
    target_ws = get_active_workspace_id(request)

    base_query = (
        select(
            PRReview,
            Repository.name.label("repository_name"),
            Repository.workspace_id.label("workspace_id"),
            Workspace.name.label("workspace_name"),
        )
        .join(Repository, PRReview.repository_id == Repository.id)
        .outerjoin(Workspace, Repository.workspace_id == Workspace.id)
    )

    if target_ws:
        # Check membership in active workspace
        mem_res = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == target_ws,
                WorkspaceMember.user_id == current_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not a member of this workspace")

        stmt = base_query.where(Repository.workspace_id == target_ws)
        if repo_id:
            stmt = stmt.where(PRReview.repository_id == repo_id)
        stmt = stmt.order_by(desc(PRReview.created_at))
        result = await db.execute(stmt)
    elif repo_id:
        repo = await db.get(Repository, repo_id)
        if not repo or not await _has_repo_view_access(db, repo, current_user):
            return []
        stmt = base_query.where(PRReview.repository_id == repo_id).order_by(desc(PRReview.created_at))
        result = await db.execute(stmt)
    else:
        # Personal reviews OR reviews for repositories in user's workspaces
        user_ws_subq = select(WorkspaceMember.workspace_id).where(
            WorkspaceMember.user_id == current_user.id
        )
        stmt = base_query.where(
            (PRReview.user_id == current_user.id)
            | (Repository.workspace_id.in_(user_ws_subq))
        ).order_by(desc(PRReview.created_at))
        result = await db.execute(stmt)

    rows = result.all()
    reviews = []
    for r, repo_name, ws_id, ws_name in rows:
        reviews.append(
            PRReviewResponse(
                id=r.id,
                user_id=r.user_id,
                repository_id=r.repository_id,
                requirement_id=r.requirement_id,
                pr_number=r.pr_number,
                pr_title=r.pr_title,
                pr_html_url=r.pr_html_url,
                status=r.status,
                summary=r.summary,
                created_at=r.created_at,
                repository_name=repo_name,
                workspace_id=ws_id,
                workspace_name=ws_name,
            )
        )
    return reviews


@router.get("/{review_id}", response_model=PRReviewResponse)
async def get_pr_review(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single PR review by ID with workspace and repo metadata."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    stmt = (
        select(
            PRReview,
            Repository.name.label("repository_name"),
            Repository.workspace_id.label("workspace_id"),
            Workspace.name.label("workspace_name"),
        )
        .join(Repository, PRReview.repository_id == Repository.id)
        .outerjoin(Workspace, Repository.workspace_id == Workspace.id)
        .where(PRReview.id == review_uuid)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise NotFoundError("PR review not found")

    pr_review, repo_name, ws_id, ws_name = row[0], row[1], row[2], row[3]
    repo = await db.get(Repository, pr_review.repository_id)
    if not repo or not await _has_repo_view_access(db, repo, current_user):
        raise ForbiddenError("Not authorized to view this PR review")

    return PRReviewResponse(
        id=pr_review.id,
        user_id=pr_review.user_id,
        repository_id=pr_review.repository_id,
        requirement_id=pr_review.requirement_id,
        pr_number=pr_review.pr_number,
        pr_title=pr_review.pr_title,
        pr_html_url=pr_review.pr_html_url,
        status=pr_review.status,
        summary=pr_review.summary,
        created_at=pr_review.created_at,
        repository_name=repo_name,
        workspace_id=ws_id,
        workspace_name=ws_name,
    )


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

    pr_review = await db.get(PRReview, review_uuid)
    if not pr_review:
        raise NotFoundError("PR review not found")

    repo = await db.get(Repository, pr_review.repository_id)
    if not repo or not await _has_repo_view_access(db, repo, current_user):
        raise ForbiddenError("Not authorized to view this PR review")

    findings_res = await db.execute(
        select(PRReviewFinding).where(PRReviewFinding.pr_review_id == review_uuid)
    )
    return findings_res.scalars().all()


@router.get("/{review_id}/diffs", response_model=list[PRFileDiffResponse])
async def get_pr_review_diffs(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all persisted per-file unified diffs for a PR review (used by the inline diff viewer)."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    pr_review = await db.get(PRReview, review_uuid)
    if not pr_review:
        raise NotFoundError("PR review not found")

    repo = await db.get(Repository, pr_review.repository_id)
    if not repo or not await _has_repo_view_access(db, repo, current_user):
        raise ForbiddenError("Not authorized to view this PR review")

    diffs_res = await db.execute(
        select(PRFileDiff)
        .where(PRFileDiff.pr_review_id == review_uuid)
        .order_by(PRFileDiff.file_path)
    )
    return diffs_res.scalars().all()


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

    repo = await db.get(Repository, pr_review.repository_id)
    if not repo or not await _has_repo_action_access(db, repo, current_user):
        raise ForbiddenError("Not authorized to post comments for this review")

    if pr_review.status != "completed":
        raise HTTPException(status_code=400, detail="Review is not completed yet")

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


@router.post("/{review_id}/rerun", status_code=status.HTTP_202_ACCEPTED)
async def rerun_pr_review(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rerun/retry a failed or completed PR review job in-place without creating a new record."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    pr_review = await db.get(PRReview, review_uuid)
    if not pr_review:
        raise NotFoundError("PR review not found")

    repo = await db.get(Repository, pr_review.repository_id)
    if not repo or not await _has_repo_action_access(db, repo, current_user):
        raise ForbiddenError("Not authorized to rerun reviews for this repository")

    # Clear old findings & file diffs so clean results are stored
    await db.execute(
        delete(PRReviewFinding).where(PRReviewFinding.pr_review_id == review_uuid)
    )
    await db.execute(
        delete(PRFileDiff).where(PRFileDiff.pr_review_id == review_uuid)
    )

    pr_review.status = "queued"
    pr_review.summary = None
    await db.commit()
    await db.refresh(pr_review)

    run_pr_review.delay(str(pr_review.id))
    return {"id": str(pr_review.id), "status": "queued"}


@router.delete("/{review_id}", status_code=status.HTTP_200_OK)
async def delete_pr_review(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a PR review and its associated findings and diffs."""
    try:
        review_uuid = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid review UUID")

    pr_review = await db.get(PRReview, review_uuid)
    if not pr_review:
        raise NotFoundError("PR review not found")

    repo = await db.get(Repository, pr_review.repository_id)
    if not repo or not await _has_repo_action_access(db, repo, current_user):
        raise ForbiddenError("Not authorized to delete this review")

    # Cascade delete findings & diffs
    await db.execute(
        delete(PRReviewFinding).where(PRReviewFinding.pr_review_id == review_uuid)
    )
    await db.execute(
        delete(PRFileDiff).where(PRFileDiff.pr_review_id == review_uuid)
    )
    await db.delete(pr_review)
    await db.commit()

    return {"id": review_id, "deleted": True}

