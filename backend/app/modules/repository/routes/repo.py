import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.repository.models.repo import Repository
from app.modules.repository.schemas.repo import (
    RepoCreate,
    RepoResponse,
    RepoSettingsUpdate,
)
from app.modules.requirement.models.req import Requirement
from app.workers.repo_sync import sync_repository

router = APIRouter(prefix="/api/v1/repositories", tags=["repositories"])


@router.get("", response_model=list[RepoResponse])
async def list_repositories(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Repository).where(Repository.user_id == current_user.id)
    )
    return result.scalars().all()


from app.modules.github.models.installation import GithubInstallation


@router.post("", response_model=RepoResponse, status_code=201)
async def add_repository(
    body: RepoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    url_str = str(body.repo_url)
    parsed = urlparse(url_str)
    path = parsed.path.strip("/")
    path = path.removesuffix(".git")
    parts = [p for p in path.split("/") if p]
    if len(parts) >= 2:
        name = f"{parts[-2]}/{parts[-1]}"
    elif len(parts) == 1:
        name = parts[0]
    else:
        name = "repository"

    # Auto-link github installation if user has one
    inst_res = await db.execute(
        select(GithubInstallation).where(GithubInstallation.user_id == current_user.id)
    )
    inst = inst_res.scalar_one_or_none()
    installation_id = inst.installation_id if inst else None

    repo = Repository(
        user_id=current_user.id,
        name=name,
        repo_url=url_str,
        github_installation_id=installation_id,
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)

    sync_repository.delay(str(repo.id), str(current_user.id))
    return repo


@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repository(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


@router.patch("/{repo_id}/settings", response_model=RepoResponse)
async def update_repository_settings(
    repo_id: str,
    body: RepoSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    if body.default_requirement_id is not None:
        req = await db.get(Requirement, body.default_requirement_id)
        if not req or req.user_id != current_user.id or req.repository_id != repo_uuid:
            raise HTTPException(
                status_code=400,
                detail="Default requirement not found or does not belong to this repository",
            )
        repo.default_requirement_id = body.default_requirement_id
    elif (
        "default_requirement_id" in body.model_fields_set
        and body.default_requirement_id is None
    ):
        repo.default_requirement_id = None

    if body.auto_review_prs is not None:
        repo.auto_review_prs = body.auto_review_prs

    if body.auto_post_comments is not None:
        repo.auto_post_comments = body.auto_post_comments

    await db.commit()
    await db.refresh(repo)
    return repo


@router.delete("/{repo_id}", status_code=204)
async def delete_repository(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    from sqlalchemy import delete

    from app.modules.impact.models.impact import AnalysisJob, ImpactResult
    from app.modules.indexing.models.index_models import (
        CodeChunk,
        CodeEmbedding,
        CodeSymbol,
        RepositoryFile,
    )
    from app.modules.pr.models.draft import PRDraft
    from app.modules.repository.models.repo import RepositorySnapshot
    from app.modules.requirement.models.req import Requirement, RequirementVersion
    from app.modules.review.models.rev_models import (
        CommitEvent,
        PRReview,
        PRReviewFinding,
        Review,
        ReviewFinding,
    )

    # 1. PR Reviews & findings
    subq_pr_rev = select(PRReview.id).where(PRReview.repository_id == repo_uuid)
    await db.execute(
        delete(PRReviewFinding).where(PRReviewFinding.pr_review_id.in_(subq_pr_rev))
    )
    await db.execute(delete(PRReview).where(PRReview.repository_id == repo_uuid))

    # 2. Commit Events, reviews & findings
    subq_ce = select(CommitEvent.id).where(CommitEvent.repository_id == repo_uuid)
    subq_rev = select(Review.id).where(Review.commit_event_id.in_(subq_ce))
    await db.execute(delete(ReviewFinding).where(ReviewFinding.review_id.in_(subq_rev)))
    await db.execute(delete(Review).where(Review.commit_event_id.in_(subq_ce)))
    await db.execute(delete(CommitEvent).where(CommitEvent.repository_id == repo_uuid))

    # 3. Requirements, analysis jobs, impact results, versions, PR drafts
    subq_req = select(Requirement.id).where(Requirement.repository_id == repo_uuid)
    subq_jobs = select(AnalysisJob.id).where(
        AnalysisJob.requirement_id.in_(subq_req)
        | (AnalysisJob.repository_id == repo_uuid)
    )
    await db.execute(delete(ImpactResult).where(ImpactResult.job_id.in_(subq_jobs)))
    await db.execute(delete(AnalysisJob).where(AnalysisJob.id.in_(subq_jobs)))
    await db.execute(delete(PRDraft).where(PRDraft.requirement_id.in_(subq_req)))
    await db.execute(
        delete(RequirementVersion).where(
            RequirementVersion.requirement_id.in_(subq_req)
        )
    )
    await db.execute(delete(Requirement).where(Requirement.repository_id == repo_uuid))

    # 4. Code index, snapshots
    await db.execute(
        delete(CodeEmbedding).where(CodeEmbedding.repository_id == repo_uuid)
    )
    await db.execute(delete(CodeChunk).where(CodeChunk.repository_id == repo_uuid))
    await db.execute(delete(CodeSymbol).where(CodeSymbol.repository_id == repo_uuid))
    await db.execute(
        delete(RepositoryFile).where(RepositoryFile.repository_id == repo_uuid)
    )
    await db.execute(
        delete(RepositorySnapshot).where(RepositorySnapshot.repository_id == repo_uuid)
    )

    await db.delete(repo)
    await db.commit()


@router.post("/{repo_id}/sync", status_code=202)
@router.post("/{repo_id}/resync", status_code=202)
async def trigger_resync(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.audit.models.audit import AuditLog

    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo.sync_status = "syncing"

    audit = AuditLog(
        user_id=str(current_user.id),
        action="repo.resync",
        resource_type="repository",
        resource_id=repo_id,
    )
    db.add(audit)
    await db.commit()

    sync_repository.delay(repo_id, str(current_user.id))
    return {"status": "syncing", "message": "Repository sync initiated"}


@router.post("/{repo_id}/cancel-sync", status_code=200)
async def cancel_repo_sync(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.audit.models.audit import AuditLog

    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo.sync_status = "failed"

    audit = AuditLog(
        user_id=str(current_user.id),
        action="repo.cancel_sync",
        resource_type="repository",
        resource_id=repo_id,
    )
    db.add(audit)
    await db.commit()

    return {"status": "failed", "message": "Repository sync cancelled"}


@router.post("/{repo_id}/index", status_code=202)
async def trigger_index(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.repository.models.repo import RepositorySnapshot
    from app.workers.repo_index import index_repository

    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repo UUID")

    repo = await db.get(Repository, repo_uuid)
    if not repo or repo.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Get latest snapshot
    result = await db.execute(
        select(RepositorySnapshot)
        .where(RepositorySnapshot.repository_id == repo_uuid)
        .order_by(RepositorySnapshot.created_at.desc())
        .limit(1)
    )
    snapshot = result.scalar_one_or_none()

    if not snapshot:
        raise HTTPException(
            status_code=400, detail="Repository has not been synced yet"
        )

    index_repository.delay(str(repo_uuid), str(snapshot.id))
    return {"job": "indexing_queued"}
