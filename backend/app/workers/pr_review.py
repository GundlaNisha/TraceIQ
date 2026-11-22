import asyncio
import re
from urllib.parse import urlparse

import httpx
from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.ai.parsers.schemas import PRReviewFindingOutput, PRReviewOutput
from app.ai.router.dispatcher import dispatch_pr_review
from app.db.session import get_worker_session
from app.modules.auth.models.user import User  # noqa: F401
from app.modules.github.models.installation import GithubInstallation
from app.modules.github.services.auth import (
    get_installation_id_for_repo,
    get_installation_token,
)
from app.modules.github.services.checks import build_ci_context, fetch_pr_checks
from app.modules.impact.models.impact import AnalysisJob, ImpactResult
from app.modules.impact.services.auto_blast_radius import ensure_pr_blast_radius
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRFileDiff, PRReview, PRReviewFinding
from app.modules.review.services.pr_matcher import resolve_requirement_for_pr
from app.workers.celery_app import celery_app
from app.workers.runner import run_async

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


def _parse_diff_into_file_patches(diff_text: str) -> list[dict]:
    """
    Parses a unified diff into clean per-file patch blocks.
    Returns list of {'file_path': str, 'patch': str}
    """
    if not diff_text:
        return []

    file_chunks = re.split(r"(?=^diff --git )", diff_text, flags=re.MULTILINE)
    patches = []

    for chunk in file_chunks:
        chunk = chunk.strip()
        if not chunk:
            continue

        # Extract file path from diff header
        match = re.search(r"^diff --git a/(.*?) b/(.*?)$", chunk, re.MULTILINE)
        file_path = match.group(2) if match else "unknown"

        patches.append(
            {
                "file_path": file_path,
                "patch": chunk,
            }
        )

    return patches


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


async def _fetch_pr_metadata(
    repo_full_name: str, pr_number: int, token: str | None
) -> dict:
    """Fetch PR metadata (title, body, head branch ref) from GitHub API."""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(
                f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}",
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception as exc:
            logger.warning(
                f"Could not fetch PR metadata for {repo_full_name}#{pr_number}: {exc!s}"
            )
    return {}


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
        except Exception as exc:
            logger.warning(
                f"PR review API exception: {exc!s}. Falling back to comment..."
            )

        # Fallback: Post as Issue Comment
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
        except Exception as exc:
            logger.error(f"Failed to post PR comment fallback: {exc!s}")


async def _process_pr_review(pr_review_id: str) -> None:
    """Core review task logic with parallel file batching."""
    async with get_worker_session() as session:
        # 1. Fetch PRReview record
        result = await session.execute(
            select(PRReview).where(PRReview.id == pr_review_id)
        )
        pr_review = result.scalar_one_or_none()
        if not pr_review:
            logger.error(f"PRReview {pr_review_id} not found — aborting.")
            return

        # Cache fields locally so they never trigger lazy loads after commits/rollbacks
        pr_number = pr_review.pr_number
        pr_title = pr_review.pr_title or "Pull Request Review"
        repository_id = pr_review.repository_id
        requirement_id = pr_review.requirement_id
        user_id = pr_review.user_id

        # 2. Set status to running
        pr_review.status = "running"
        await session.commit()

        try:
            # 3. Fetch Repository info
            repo_result = await session.execute(
                select(Repository).where(Repository.id == repository_id)
            )
            repository = repo_result.scalar_one_or_none()
            if not repository:
                raise ValueError(
                    f"Repository {repository_id} not found for PRReview {pr_review_id}"
                )

            repo_full_name = _extract_full_name(repository)
            auto_post_comments = repository.auto_post_comments is not False
            if not repo_full_name:
                raise ValueError(
                    f"Could not determine repo_full_name for repo {repository.id}"
                )

            # 4. Resolve GitHub App Installation Token
            token: str | None = None
            if repository.github_installation_id:
                try:
                    token = get_installation_token(repository.github_installation_id)
                except Exception as exc:
                    logger.warning(
                        f"Could not get token for repo installation {repository.github_installation_id}: {exc!s}"
                    )

            if not token:
                inst_id = get_installation_id_for_repo(repo_full_name)
                if inst_id:
                    try:
                        token = get_installation_token(inst_id)
                        repository.github_installation_id = inst_id
                        await session.commit()
                    except Exception as exc:
                        await session.rollback()
                        logger.warning(
                            f"Could not persist installation {inst_id}: {exc!s}"
                        )

            if not token:
                inst_result = await session.execute(
                    select(GithubInstallation).where(
                        GithubInstallation.user_id == user_id
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

            # 5. Fetch PR diff & metadata from GitHub
            pr_diff = await _fetch_pr_diff(repo_full_name, pr_number, token)
            if not pr_diff:
                raise ValueError("Empty PR diff — cannot review.")

            pr_metadata = await _fetch_pr_metadata(repo_full_name, pr_number, token)
            pr_body = pr_metadata.get("body") or ""
            head_ref = (pr_metadata.get("head") or {}).get("ref", "")
            if pr_metadata.get("title") and pr_title in ("Pull Request Review", ""):
                pr_title = pr_metadata.get("title")
                pr_review.pr_title = pr_title
                await session.commit()

            # 6. Autonomous Requirement Resolution & Grounding
            req_record = None
            if not requirement_id:
                logger.info(
                    f"No requirement_id linked on PRReview {pr_review_id}. Autonomously resolving..."
                )
                matched_req, resolution_method = await resolve_requirement_for_pr(
                    db=session,
                    repository=repository,
                    pr_title=pr_title,
                    pr_body=pr_body,
                    head_ref=head_ref,
                    pr_number=pr_number,
                )
                if matched_req:
                    requirement_id = matched_req.id
                    pr_review.requirement_id = matched_req.id
                    req_record = matched_req
                    await session.commit()
                    logger.info(
                        f"Autonomously attached requirement {matched_req.id} ({resolution_method}) to PRReview {pr_review_id}"
                    )
            else:
                req_result = await session.execute(
                    select(Requirement).where(Requirement.id == requirement_id)
                )
                req_record = req_result.scalar_one_or_none()

            req_text = ""
            analysis_context = ""
            impacted_paths: list[dict] = []

            # 7. High-Performance Multi-File Chunking
            file_patches = _parse_diff_into_file_patches(pr_diff)

            # 8. Autonomous 2-Hop AST Blast Radius Computation
            if req_record:
                req_text = f"Title: {req_record.title}\nVersion: {req_record.version_number}\nDescription:\n{req_record.text}"
                try:
                    analysis_context, impacted_paths = await ensure_pr_blast_radius(
                        db=session,
                        repository=repository,
                        requirement=req_record,
                        file_patches=file_patches,
                    )
                except Exception as blast_err:
                    logger.warning(
                        f"ensure_pr_blast_radius encountered non-fatal error: {blast_err!s}"
                    )

            # 8b. Fetch live CI status so the review reads failing checks.
            ci_context = ""
            try:
                ci_summary = await fetch_pr_checks(
                    repo_full_name, pr_number, token
                )
                ci_context = build_ci_context(ci_summary, impacted_paths)
            except Exception as exc:
                logger.warning(f"CI context fetch skipped (non-fatal): {exc!s}")

            # 9. Parallel / Chunked AI Review Execution
            all_findings: list[PRReviewFindingOutput] = []
            final_summary = ""

            if len(file_patches) > 4:
                # Group patches into batches of 3-4 files and evaluate concurrently
                patch_batches = [
                    file_patches[i : i + 4] for i in range(0, len(file_patches), 4)
                ]
                logger.info(
                    f"Evaluating {len(file_patches)} files in {len(patch_batches)} parallel review tasks..."
                )

                async def review_patch_batch(
                    batch: list[dict], batch_idx: int
                ) -> PRReviewOutput:
                    combined_patch_diff = "\n\n".join(p["patch"] for p in batch)
                    batch_title = f"{pr_title} (Batch {batch_idx + 1}/{len(patch_batches)})"
                    return await dispatch_pr_review(
                        batch_title,
                        combined_patch_diff,
                        req_text,
                        analysis_context,
                        ci_context,
                    )

                tasks = [
                    review_patch_batch(batch, idx)
                    for idx, batch in enumerate(patch_batches)
                ]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)

                summaries = []
                for res in batch_results:
                    if isinstance(res, PRReviewOutput):
                        all_findings.extend(res.findings)
                        if res.summary:
                            summaries.append(res.summary)
                    elif isinstance(res, Exception):
                        logger.warning(
                            f"Parallel review batch encountered error: {res!s}"
                        )

                final_summary = " ".join(summaries)
            else:
                # Direct single-pass review for compact diffs
                if len(pr_diff) > 120_000:
                    pr_diff = pr_diff[:120_000] + "\n\n[... diff truncated ...]"

                ai_result = await dispatch_pr_review(
                    pr_title, pr_diff, req_text, analysis_context, ci_context
                )
                all_findings = ai_result.findings
                final_summary = ai_result.summary

            # 8. Persist per-file raw diffs (powers the inline diff viewer)
            for patch_info in file_patches:
                additions = patch_info["patch"].count("\n+")
                deletions = patch_info["patch"].count("\n-")
                file_diff = PRFileDiff(
                    pr_review_id=pr_review_id,
                    file_path=patch_info["file_path"],
                    patch=patch_info["patch"],
                    additions=additions,
                    deletions=deletions,
                )
                session.add(file_diff)

            # 9. Save findings to DB
            saved_findings = []
            for finding in all_findings:
                rf = PRReviewFinding(
                    pr_review_id=pr_review_id,
                    file_path=finding.file_path,
                    line_number=finding.line_number,
                    severity=finding.severity,
                    message=finding.message,
                    requirement_gap=finding.requirement_gap,
                )
                session.add(rf)
                saved_findings.append(rf)

            pr_review.summary = final_summary
            pr_review.status = "completed"
            await session.commit()

            # 10. Post review to GitHub as native PR Review / Comment (if auto_post_comments enabled)
            if auto_post_comments:
                if token:
                    try:
                        await _post_pr_review_to_github(
                            repo_full_name,
                            pr_number,
                            token,
                            final_summary,
                            saved_findings,
                        )
                        logger.info(
                            f"⚡ Automated PR review comment posted to GitHub PR #{pr_number} in {repo_full_name}"
                        )
                    except Exception as gh_err:
                        logger.error(
                            f"GitHub PR review auto-post failed (non-fatal): {gh_err!s}"
                        )
                else:
                    logger.warning(
                        f"Auto-post comments enabled for {repo_full_name}, but no GitHub token was available."
                    )

            # 11. Sync review audit to linked Jira ticket (if requirement is Jira-linked)
            if req_record and req_record.jira_issue_key:
                try:
                    from app.modules.jira.services.jira_service import get_active_jira_client

                    jira_client, _ = await get_active_jira_client(
                        session, repository.user_id, repository.workspace_id
                    )
                    high_cnt = sum(1 for f in saved_findings if f.severity == "high")
                    med_cnt = sum(1 for f in saved_findings if f.severity == "medium")
                    low_cnt = sum(1 for f in saved_findings if f.severity == "low")
                    verdict_str = (
                        "⚠️ Changes Requested"
                        if high_cnt
                        else ("🟡 Warnings" if med_cnt else "✅ Approved")
                    )
                    jira_comment = (
                        f"🤖 *TraceIQ Autonomous Code Intelligence Review*\n\n"
                        f"Pull Request [#{pr_number}|{pr_review.pr_html_url}] has been reviewed.\n\n"
                        f"*Verdict:* {verdict_str}\n"
                        f"*Findings:* 🔴 {high_cnt} High · 🟡 {med_cnt} Medium · 🔵 {low_cnt} Low\n\n"
                        f"*Summary:*\n{final_summary[:600]}..."
                    )
                    await jira_client.post_comment(req_record.jira_issue_key, jira_comment)
                    logger.info(
                        f"✅ Synced review summary to Jira issue {req_record.jira_issue_key}"
                    )
                except Exception as jira_err:
                    logger.warning(f"Jira audit sync non-fatal error: {jira_err!s}")

            logger.info(
                f"⚡ PRReview {pr_review_id} completed successfully ({len(saved_findings)} findings)."
            )

        except Exception:
            logger.exception(f"PRReview {pr_review_id} failed")
            await session.rollback()
            try:
                fail_result = await session.execute(
                    select(PRReview).where(PRReview.id == pr_review_id)
                )
                failed_review = fail_result.scalar_one_or_none()
                if failed_review:
                    failed_review.status = "failed"
                    await session.commit()
            except Exception as inner_exc:
                logger.error(
                    f"Could not update PRReview {pr_review_id} status to failed: {inner_exc!s}"
                )


@celery_app.task(name="app.workers.pr_review.process_pr_review")
def process_pr_review(pr_review_id: str) -> None:
    """Synchronous Celery entry point."""
    run_async(_process_pr_review, pr_review_id)


# Alias for backwards compatibility
run_pr_review = process_pr_review
