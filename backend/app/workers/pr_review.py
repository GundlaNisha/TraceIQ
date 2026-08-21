import asyncio
from urllib.parse import urlparse

import httpx
from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.ai.router.dispatcher import dispatch_pr_review
from app.db.session import get_worker_session
from app.modules.auth.models.user import User  # noqa: F401
from app.modules.github.models.installation import GithubInstallation
from app.modules.github.services.auth import (
    get_installation_id_for_repo,
    get_installation_token,
)
from app.modules.impact.models.impact import AnalysisJob, ImpactResult
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRReview, PRReviewFinding
from app.workers.celery_app import celery_app

logger = get_task_logger(__name__)


def _extract_full_name(repo: Repository) -> str:
    """Extract 'owner/repo' from repository name or URL."""
    if repo.name and "/" in repo.name:
        return repo.name.strip("/")

    if repo.repo_url:
        parsed = urlparse(repo.repo_url)
        path = parsed.path.strip("/").removesuffix(".git")
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2:
            return f"{parts[-2]}/{parts[-1]}"
        if len(parts) == 1:
            return parts[0]

    return repo.name or ""


async def _fetch_pr_diff(repo_full_name: str, pr_number: int, token: str | None) -> str:
    """Fetch the raw unified diff for a GitHub PR."""
    headers = {
        "Accept": "application/vnd.github.v3.diff",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.get(
                f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}",
                headers=headers,
            )
            if response.status_code == 200 and response.text:
                return response.text
        except Exception as exc:
            logger.warning(
                f"API diff fetch error for {repo_full_name}#{pr_number}: {exc!s}"
            )

        # Fallback to direct patch-diff endpoint
        try:
            diff_resp = await client.get(
                f"https://patch-diff.githubusercontent.com/raw/{repo_full_name}/pull/{pr_number}.diff",
                headers={"Accept": "text/plain"},
            )
            if diff_resp.status_code == 200 and diff_resp.text:
                return diff_resp.text
        except Exception as exc:
            logger.warning(
                f"Patch diff fetch error for {repo_full_name}#{pr_number}: {exc!s}"
            )

        logger.error(f"Failed to fetch PR diff for {repo_full_name}#{pr_number}")
        return ""


async def _post_pr_review_to_github(
    repo_full_name: str,
    pr_number: int,
    token: str,
    summary: str,
    findings: list,
) -> None:
    """Post all findings as a GitHub PR Review or PR Issue Comment."""
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
        sections.append(
            "### 🔴 High Severity\n"
            + "\n\n---\n\n".join(format_finding(f) for f in high)
        )
    if medium:
        sections.append(
            "### 🟡 Medium Severity\n"
            + "\n\n---\n\n".join(format_finding(f) for f in medium)
        )
    if low:
        sections.append(
            "### 🔵 Low Severity\n" + "\n\n---\n\n".join(format_finding(f) for f in low)
        )

    stats = f"🔴 {len(high)} High · 🟡 {len(medium)} Medium · 🔵 {len(low)} Low"
    body = (
        f"## 🤖 TraceIQ AI Code Review\n\n"
        f"> {stats}\n\n"
        f"### Summary\n{summary}\n\n"
        + (
            "\n\n".join(sections)
            if sections
            else "_No issues found — this PR looks good!_ ✅"
        )
    )

    async with httpx.AsyncClient(timeout=30) as client:
        # Primary Attempt: Post as official Pull Request Review
        try:
            response = await client.post(
                f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}/reviews",
                json={"body": body, "event": "COMMENT"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github.v3+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            if response.status_code in (200, 201):
                logger.info(
                    f"✅ Successfully posted TraceIQ PR review to GitHub {repo_full_name}#{pr_number}"
                )
                return
            logger.warning(
                f"PR review API returned {response.status_code} ({response.text[:200]}). Falling back to PR issue comment..."
            )
        except Exception as exc:
            logger.warning(
                f"PR review API exception: {exc!s}. Falling back to PR issue comment..."
            )

        # Fallback Attempt: Post as Issue Comment on the PR conversation
        try:
            comment_resp = await client.post(
                f"https://api.github.com/repos/{repo_full_name}/issues/{pr_number}/comments",
                json={"body": body},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github.v3+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            if comment_resp.status_code in (200, 201):
                logger.info(
                    f"✅ Successfully posted TraceIQ comment to GitHub PR {repo_full_name}#{pr_number}"
                )
            else:
                logger.error(
                    f"Failed to post GitHub PR comment for {repo_full_name}#{pr_number} "
                    f"({comment_resp.status_code}): {comment_resp.text[:500]}"
                )
        except Exception as exc:
            logger.error(f"Failed to post PR comment fallback: {exc!s}")


async def _process_pr_review(pr_review_id: str) -> None:
    async with get_worker_session() as session:
        try:
            # 1. Fetch PRReview record
            result = await session.execute(
                select(PRReview).where(PRReview.id == pr_review_id)
            )
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

            # 3. Derive owner/repo accurately from URL or name
            repo_full_name = _extract_full_name(repository)

            # 4. Fetch linked GitHub Installation token
            token = None
            if repository.github_installation_id:
                try:
                    token = get_installation_token(repository.github_installation_id)
                except Exception as exc:
                    logger.warning(
                        f"Could not get installation token for repo installation {repository.github_installation_id}: {exc!s}"
                    )

            # If not already linked, dynamically discover installation for this repo
            if not token and repo_full_name:
                inst_id = get_installation_id_for_repo(repo_full_name)
                if inst_id:
                    try:
                        token = get_installation_token(inst_id)
                        # Ensure GithubInstallation record exists first to satisfy foreign key constraint
                        inst_check = await session.execute(
                            select(GithubInstallation).where(
                                GithubInstallation.installation_id == inst_id
                            )
                        )
                        inst_rec = inst_check.scalar_one_or_none()
                        if not inst_rec:
                            parts = [
                                p for p in repo_full_name.strip("/").split("/") if p
                            ]
                            account_name = parts[0] if parts else "github-user"
                            inst_rec = GithubInstallation(
                                user_id=pr_review.user_id,
                                installation_id=inst_id,
                                account_name=account_name,
                            )
                            session.add(inst_rec)
                            await session.flush()

                        repository.github_installation_id = inst_id
                        await session.commit()
                        logger.info(
                            f"Discovered and linked GitHub App installation {inst_id} for repo {repo_full_name}"
                        )
                    except Exception as exc:
                        await session.rollback()
                        logger.warning(
                            f"Could not persist discovered installation {inst_id}: {exc!s}"
                        )

            # Fallback to user installation
            if not token:
                inst_result = await session.execute(
                    select(GithubInstallation).where(
                        GithubInstallation.user_id == pr_review.user_id
                    )
                )
                installation = inst_result.scalar_one_or_none()
                if installation:
                    try:
                        token = get_installation_token(installation.installation_id)
                    except Exception as exc:
                        logger.warning(
                            f"Could not get user installation token: {exc!s}"
                        )

            # 5. Fetch PR diff from GitHub
            pr_diff = await _fetch_pr_diff(repo_full_name, pr_review.pr_number, token)
            if not pr_diff:
                raise ValueError("Empty PR diff — cannot review.")

            # Truncate to ~120k chars to stay within model context limits
            if len(pr_diff) > 120_000:
                pr_diff = (
                    pr_diff[:120_000] + "\n\n[... diff truncated for context limit ...]"
                )

            # 6. Fetch linked requirement text and impact analysis (if any)
            req_text = ""
            analysis_context = ""
            if pr_review.requirement_id:
                req_result = await session.execute(
                    select(Requirement).where(
                        Requirement.id == pr_review.requirement_id
                    )
                )
                req = req_result.scalar_one_or_none()
                if req:
                    req_text = (
                        f"Title: {req.title}\n\nDescription & Criteria:\n{req.text}"
                    )

                    # Look up latest completed impact analysis for this requirement
                    impact_stmt = (
                        select(ImpactResult)
                        .join(AnalysisJob, ImpactResult.job_id == AnalysisJob.id)
                        .where(
                            AnalysisJob.requirement_id == pr_review.requirement_id,
                            AnalysisJob.status == "completed",
                        )
                        .order_by(AnalysisJob.created_at.desc())
                        .limit(1)
                    )
                    impact_res = await session.execute(impact_stmt)
                    impact_result = impact_res.scalar_one_or_none()
                    if impact_result and impact_result.impacted_files:
                        files_data = impact_result.impacted_files
                        impacted_list = (
                            files_data.get("impacted_files", [])
                            if isinstance(files_data, dict)
                            else files_data
                            if isinstance(files_data, list)
                            else []
                        )

                        if impacted_list:
                            analysis_context = (
                                "### Expected Impact Analysis Blast Radius:\n"
                            )
                            for f in impacted_list[:12]:
                                path = f.get("file_path", "")
                                conf = f.get("confidence", "")
                                symbols = ", ".join(f.get("impacted_symbols", []))
                                tests = ", ".join(f.get("related_tests", []))
                                analysis_context += (
                                    f"- File `{path}` (Confidence: {conf})\n"
                                )
                                if symbols:
                                    analysis_context += (
                                        f"  - Impacted Symbols: `{symbols}`\n"
                                    )
                                if tests:
                                    analysis_context += (
                                        f"  - Expected Tests: `{tests}`\n"
                                    )

            # 7. Dispatch to LLM with full requirement and impact context
            ai_result = await dispatch_pr_review(
                pr_review.pr_title, pr_diff, req_text, analysis_context
            )

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

            # 9. Post review to GitHub as native PR Review / Comment (if auto_post_comments enabled)
            if repository.auto_post_comments:
                if token:
                    try:
                        await _post_pr_review_to_github(
                            repo_full_name,
                            pr_review.pr_number,
                            token,
                            ai_result.summary,
                            saved_findings,
                        )
                        logger.info(
                            f"Automated PR review comment posted to GitHub PR #{pr_review.pr_number} in {repo_full_name}"
                        )
                    except Exception as gh_err:
                        logger.error(
                            f"GitHub PR review auto-post failed (non-fatal): {gh_err!s}"
                        )
                else:
                    logger.warning(
                        f"No GitHub token found for {repo_full_name} — skipping auto-posting review to GitHub."
                    )
            else:
                logger.info(
                    f"Auto-post comments disabled for {repo_full_name}. Findings saved to dashboard."
                )

        except Exception:
            logger.exception(f"PR review failed for {pr_review_id}")
            await session.rollback()
            result = await session.execute(
                select(PRReview).where(PRReview.id == pr_review_id)
            )
            failed_review = result.scalar_one_or_none()
            if failed_review:
                failed_review.status = "failed"
                await session.commit()


@celery_app.task
def run_pr_review(pr_review_id: str) -> None:
    asyncio.run(_process_pr_review(pr_review_id))
