import asyncio

import httpx
from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.ai.router.dispatcher import dispatch_pr_review
from app.db.session import AsyncSessionLocal
from app.modules.github.models.installation import GithubInstallation
from app.modules.github.services.auth import get_installation_token
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRReview, PRReviewFinding
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


async def _fetch_pr_diff(repo_full_name: str, pr_number: int, token: str) -> str:
    """Fetch the raw unified diff for a GitHub PR."""
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(
            f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3.diff",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        )
        if response.status_code == 200:
            return response.text
        logger.error(f"Failed to fetch PR diff for {repo_full_name}#{pr_number}: {response.text[:300]}")
        return ""


async def _post_pr_review_to_github(
    repo_full_name: str,
    pr_number: int,
    token: str,
    summary: str,
    findings: list,
) -> None:
    """Post all findings as a GitHub PR Review (body-only, no inline comments).

    Inline comments require a diff-position number (not a file line number), so
    we skip them and post everything in the review body — which always works,
    renders beautifully as a proper 'Review' on the PR, and is not rejected by
    the GitHub API due to unmapped positions.
    """
    severity_order = {"high": 0, "medium": 1, "low": 2}
    sorted_findings = sorted(findings, key=lambda f: severity_order.get(f.severity, 3))

    high = [f for f in sorted_findings if f.severity == "high"]
    medium = [f for f in sorted_findings if f.severity == "medium"]
    low = [f for f in sorted_findings if f.severity == "low"]

    def format_finding(f) -> str:
        emoji = {"high": "🔴", "medium": "🟡", "low": "🔵"}.get(f.severity, "⚪")
        loc = f"`{f.file_path}" + (f":{f.line_number}" if f.line_number else "") + "`"
        lines = [f"#### {emoji} {f.severity.upper()} — {loc}\n{f.message}"]
        if f.requirement_gap:
            lines.append(f"\n> 📋 **Requirement gap:** {f.requirement_gap}")
        return "\n".join(lines)

    sections = []
    if high:
        sections.append("### 🔴 High Severity\n" + "\n\n---\n\n".join(format_finding(f) for f in high))
    if medium:
        sections.append("### 🟡 Medium Severity\n" + "\n\n---\n\n".join(format_finding(f) for f in medium))
    if low:
        sections.append("### 🔵 Low Severity\n" + "\n\n---\n\n".join(format_finding(f) for f in low))

    stats = f"🔴 {len(high)} High · 🟡 {len(medium)} Medium · 🔵 {len(low)} Low"
    body = (
        f"## 🤖 TraceIQ AI Code Review\n\n"
        f"> {stats}\n\n"
        f"### Summary\n{summary}\n\n"
        + ("\n\n".join(sections) if sections else "_No issues found — this PR looks good!_ ✅")
    )

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}/reviews",
            json={"body": body, "event": "COMMENT"},
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }
        )
        if response.status_code not in (200, 201):
            logger.error(
                f"Failed to post GitHub PR review for {repo_full_name}#{pr_number} "
                f"({response.status_code}): {response.text[:500]}"
            )
        else:
            logger.info(f"✅ Posted TraceIQ review to GitHub PR {repo_full_name}#{pr_number}")



async def _process_pr_review(pr_review_id: str) -> None:
    async with AsyncSessionLocal() as session:
        try:
            # 1. Fetch PRReview record
            result = await session.execute(select(PRReview).where(PRReview.id == pr_review_id))
            pr_review = result.scalar_one_or_none()
            if not pr_review:
                logger.error(f"PRReview {pr_review_id} not found.")
                return

            pr_review.status = "running"
            await session.commit()

            # 2. Fetch Repository
            repo_result = await session.execute(
                select(Repository).where(Repository.id == pr_review.repository_id)
            )
            repository = repo_result.scalar_one()

            # 3. Fetch linked GitHub Installation token
            inst_result = await session.execute(
                select(GithubInstallation).where(
                    GithubInstallation.user_id == pr_review.user_id
                )
            )
            installation = inst_result.scalar_one_or_none()

            if not installation:
                raise ValueError("No GitHub installation found for this user.")

            token = get_installation_token(installation.installation_id)

            # 4. Derive owner/repo from the stored repo name
            repo_full_name = repository.name
            if "/" not in repo_full_name:
                repo_full_name = f"{installation.account_name}/{repo_full_name}"

            # 5. Fetch PR diff from GitHub
            pr_diff = await _fetch_pr_diff(repo_full_name, pr_review.pr_number, token)
            if not pr_diff:
                raise ValueError("Empty PR diff — cannot review.")

            # Truncate to ~120k chars to stay within model context limits
            if len(pr_diff) > 120_000:
                pr_diff = pr_diff[:120_000] + "\n\n[... diff truncated for context limit ...]"

            # 6. Fetch linked requirement text (if any)
            req_text = ""
            if pr_review.requirement_id:
                req_result = await session.execute(
                    select(Requirement).where(Requirement.id == pr_review.requirement_id)
                )
                req = req_result.scalar_one_or_none()
                if req:
                    req_text = f"{req.title}\n\n{req.text}"

            # 7. Dispatch to LLM
            ai_result = await dispatch_pr_review(pr_review.pr_title, pr_diff, req_text)

            # 8. Save findings to DB
            saved_findings = []
            for finding in ai_result.findings:
                rf = PRReviewFinding(
                    pr_review_id=pr_review.id,
                    file_path=finding.file_path,
                    line_number=finding.line_number,
                    severity=finding.severity,
                    message=finding.message,
                    requirement_gap=finding.requirement_gap,
                )
                session.add(rf)
                saved_findings.append(rf)

            pr_review.summary = ai_result.summary
            pr_review.status = "completed"
            await session.commit()

            # 9. Post review to GitHub as native PR Review
            if saved_findings:
                try:
                    await _post_pr_review_to_github(
                        repo_full_name,
                        pr_review.pr_number,
                        token,
                        ai_result.summary,
                        saved_findings,
                    )
                except Exception as gh_err:
                    logger.error(f"GitHub PR review post failed (non-fatal): {gh_err!s}")

        except Exception:
            logger.exception(f"PR review failed for {pr_review_id}")
            await session.rollback()
            result = await session.execute(select(PRReview).where(PRReview.id == pr_review_id))
            pr_review = result.scalar_one_or_none()
            if pr_review:
                pr_review.status = "failed"
                await session.commit()


@celery_app.task
def run_pr_review(pr_review_id: str) -> None:
    asyncio.run(_process_pr_review(pr_review_id))
