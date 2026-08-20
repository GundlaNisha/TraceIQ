import hashlib
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.modules.repository.models.repo import Repository
from app.modules.review.models.rev_models import PRReview
from app.workers.pr_review import run_pr_review

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
    Listens to GitHub Webhook events (Pull Requests, etc.)
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
            pr_number = pull_request.get("number")
            pr_title = pull_request.get("title", "")
            pr_html_url = pull_request.get("html_url", "")
            repo_url = payload.get("repository", {}).get("html_url")

            if pr_number and repo_url:
                result = await db.execute(
                    select(Repository).where(Repository.repo_url == repo_url)
                )
                repo = result.scalar_one_or_none()

                if repo:
                    logger.info(
                        f"Triggering AI review for PR #{pr_number} in {repo_url}"
                    )
                    pr_review = PRReview(
                        repository_id=repo.id,
                        user_id=repo.user_id,
                        pr_number=pr_number,
                        pr_title=pr_title,
                        pr_html_url=pr_html_url,
                        status="queued",
                    )
                    db.add(pr_review)
                    await db.commit()
                    await db.refresh(pr_review)
                    run_pr_review.delay(str(pr_review.id))
                else:
                    logger.warning(
                        f"Webhook received for untracked repository: {repo_url}"
                    )

    return {"status": "ok"}
