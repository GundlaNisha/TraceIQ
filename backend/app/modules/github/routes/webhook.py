import hashlib
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.modules.repository.models.repo import Repository
from app.modules.review.models.rev_models import CommitEvent
from app.workers.commit_review import run_commit_review

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/github", tags=["github"])


def verify_signature(payload_body: bytes, signature_header: str, secret: str) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected_signature = (
        "sha256=" + hmac.new(secret.encode(), payload_body, hashlib.sha256).hexdigest()
    )

    return hmac.compare_digest(expected_signature, signature_header)


@router.post("/webhook")
async def github_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Listens to GitHub Webhook events (Pull Requests, pushes, etc.)
    """
    secret = settings.github_webhook_secret
    if not secret:
        logger.error("GITHUB_WEBHOOK_SECRET is not configured")
        raise HTTPException(
            status_code=500, detail="Server webhook configuration error"
        )

    payload_body = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256", "")

    if not verify_signature(payload_body, signature_header, secret):
        logger.warning("Invalid webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = request.headers.get("X-GitHub-Event", "")
    payload = await request.json()

    if event == "pull_request":
        action = payload.get("action")
        # Process 'opened' or 'synchronize' (new commits pushed to PR)
        if action in ["opened", "synchronize"]:
            pull_request = payload.get("pull_request", {})
            head_commit = pull_request.get("head", {}).get("sha")
            repo_url = payload.get("repository", {}).get("html_url")

            if head_commit and repo_url:
                # Find the repository in our DB
                result = await db.execute(
                    select(Repository).where(Repository.repo_url == repo_url)
                )
                repo = result.scalar_one_or_none()

                if repo:
                    logger.info(
                        f"Triggering AI review for PR in {repo_url} (commit: {head_commit[:7]})"
                    )
                    # Create a CommitEvent to track this review
                    commit_event = CommitEvent(
                        repository_id=repo.id,
                        user_id=repo.user_id,
                        commit_hash=head_commit,
                        status="queued",
                    )
                    db.add(commit_event)
                    await db.commit()
                    await db.refresh(commit_event)
                    # Queue the background worker
                    run_commit_review.delay(str(commit_event.id))
                else:
                    logger.warning(
                        f"Webhook received for untracked repository: {repo_url}"
                    )

    elif event == "push":
        # Optionally handle direct pushes too
        head_commit = payload.get("head_commit", {}).get("id")
        repo_url = payload.get("repository", {}).get("html_url")
        ref = payload.get("ref", "")

        if head_commit and repo_url and ref.startswith("refs/heads/"):
            result = await db.execute(
                select(Repository).where(Repository.repo_url == repo_url)
            )
            repo = result.scalar_one_or_none()
            if repo:
                logger.info(
                    f"Push to {ref} in {repo_url} — queuing review for {head_commit[:7]}"
                )
                commit_event = CommitEvent(
                    repository_id=repo.id,
                    user_id=repo.user_id,
                    commit_hash=head_commit,
                    status="queued",
                )
                db.add(commit_event)
                await db.commit()
                await db.refresh(commit_event)
                run_commit_review.delay(str(commit_event.id))

    return {"status": "ok"}
