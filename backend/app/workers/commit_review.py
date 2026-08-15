import asyncio
import os
import shutil
import subprocess
import tempfile

import git
from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.ai.router.dispatcher import dispatch_commit_review
from app.db.session import AsyncSessionLocal
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.retrieval.services.semantic import semantic_search
from app.modules.review.models.rev_models import CommitDiff, CommitEvent, ReviewFinding
from app.modules.review.services.diff_extractor import extract_diff
from app.workers.celery_app import celery_app


def check_missing_tests(diffs: list[dict]) -> list[str]:
    missing = []
    diff_files = {d["file_path"] for d in diffs}
    for d in diffs:
        fp = d["file_path"]
        if "test_" in fp or "_test" in fp or ".spec." in fp or ".test." in fp:
            continue

        basename = os.path.basename(fp)
        name, ext = os.path.splitext(basename)

        test_names = [
            f"test_{name}{ext}",
            f"{name}_test{ext}",
            f"{name}.spec{ext}",
            f"{name}.test{ext}",
        ]

        found_test = any(
            any(test_name in df for df in diff_files) for test_name in test_names
        )

        if not found_test and ext in [".py", ".js", ".ts", ".jsx", ".tsx"]:
            missing.append(f"Missing test for {fp}")

    return missing


def run_linter(temp_dir: str, diffs: list[dict]) -> str:
    """Run ruff on any changed Python files, if ruff is available."""
    if not shutil.which("ruff"):
        return ""  # ruff not available in this environment
    py_files = [
        os.path.join(temp_dir, d["file_path"])
        for d in diffs
        if d["file_path"].endswith(".py")
    ]
    existing_files = [f for f in py_files if os.path.exists(f)]
    if not existing_files:
        return ""
    try:
        result = subprocess.run(
            ["ruff", "check"] + existing_files,
            cwd=temp_dir,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        return (result.stdout + "\n" + result.stderr).strip()
    except subprocess.TimeoutExpired:
        return "Linter timed out"
    except Exception as e:
        return f"Linter execution failed: {e}"


logger = get_task_logger(__name__)


async def _process_commit_review(commit_event_id: str):
    async with AsyncSessionLocal() as session:
        try:
            # 1. Fetch CommitEvent
            stmt = select(CommitEvent).where(CommitEvent.id == commit_event_id)
            result = await session.execute(stmt)
            commit_event = result.scalar_one_or_none()
            if not commit_event:
                logger.error(f"CommitEvent {commit_event_id} not found.")
                return

            # Update status to processing
            commit_event.status = "running"
            await session.commit()

            # Fetch repository URL
            repo_result = await session.execute(
                select(Repository).where(Repository.id == commit_event.repository_id)
            )
            repository = repo_result.scalar_one()

            # Fetch requirement text if provided
            req_text = ""
            if commit_event.requirement_id:
                req_result = await session.execute(
                    select(Requirement).where(
                        Requirement.id == commit_event.requirement_id
                    )
                )
                req = req_result.scalar_one_or_none()
                if req:
                    req_text = req.text

            # 2. Re-download/clone fresh to get full git history for this specific commit
            repo_url = repository.repo_url
            if repository.github_installation_id:
                from app.modules.github.services.auth import get_installation_token

                token = get_installation_token(repository.github_installation_id)
                if repo_url.startswith("https://"):
                    repo_url = repo_url.replace(
                        "https://", f"https://x-access-token:{token}@"
                    )

            with tempfile.TemporaryDirectory() as temp_dir:
                # Shallow clone (depth=10) — enough history to compute the diff
                # against parent commit without downloading the entire repo history.
                git.Repo.clone_from(repo_url, temp_dir, depth=10)

                # 3. Extract diff
                diffs = extract_diff(temp_dir, commit_event.commit_hash)

                # 3.5 Check tests and run linter
                missing_tests = check_missing_tests(diffs)
                linter_output = run_linter(temp_dir, diffs)

                # 4. Truncate handled in diff_extractor. Now bulk insert CommitDiff rows
                for diff_data in diffs:
                    commit_diff = CommitDiff(
                        commit_event_id=commit_event.id,
                        file_path=diff_data["file_path"],
                        diff_text=diff_data["diff_text"],
                        additions=diff_data["additions"],
                        deletions=diff_data["deletions"],
                    )
                    session.add(commit_diff)

                await session.flush()

                # Format full diff text to send to AI
                full_diff_text = "\n\n".join(
                    [f"File: {d['file_path']}\n{d['diff_text']}" for d in diffs]
                )

                # 5. Semantic search for context around changed files
                # We can search the repository using the modified file paths or diff text as the query
                chunks = []
                if diffs:
                    query = " ".join([d["file_path"] for d in diffs])
                    search_results = await semantic_search(
                        session, query, repository.id, top_k=10
                    )
                    chunks = [
                        {"file_path": item["file_path"], "chunk_text": item["snippet"]}
                        for item in search_results
                    ]

                # 6. Dispatch the LLM
                ai_result = await dispatch_commit_review(
                    full_diff_text, req_text, chunks, linter_output, missing_tests
                )

                # 7. Bulk insert ReviewFinding rows from AI output
                for finding in ai_result.findings:
                    rf = ReviewFinding(
                        commit_event_id=commit_event.id,
                        file_path=finding.file_path,
                        line_number=finding.line_number,
                        severity=finding.severity,
                        message=finding.message,
                    )
                    session.add(rf)

                # 8. Set status to completed
                commit_event.status = "completed"
                await session.commit()

                # 9. Post findings to GitHub if it's an app installation
                if repository.github_installation_id and ai_result.findings:
                    import re

                    from app.modules.github.services.auth import (
                        get_github_client_for_installation,
                    )

                    match = re.search(
                        r"github\.com/([^/]+)/([^/.]+)", repository.repo_url
                    )
                    if match:
                        owner_repo = f"{match.group(1)}/{match.group(2)}"
                        try:
                            client = get_github_client_for_installation(
                                repository.github_installation_id
                            )
                            gh_repo = client.get_repo(owner_repo)
                            gh_commit = gh_repo.get_commit(commit_event.commit_hash)
                            pulls = gh_commit.get_pulls()

                            body = "## 🤖 TraceIQ AI Pre-Review Findings\n\n"
                            for finding in ai_result.findings:
                                body += f"- **{finding.severity.upper()}** in `{finding.file_path}:{finding.line_number}`: {finding.message}\n"

                            if pulls.totalCount > 0:
                                pr = pulls[0]
                                pr.create_issue_comment(body)
                            else:
                                gh_commit.create_comment(body)
                        except Exception as gh_ex:
                            logger.error(f"Failed to post review to GitHub: {gh_ex!s}")

        except Exception as e:
            logger.error(f"Commit review failed for {commit_event_id}: {e!s}")
            await session.rollback()
            stmt = select(CommitEvent).where(CommitEvent.id == commit_event_id)
            result = await session.execute(stmt)
            commit_event = result.scalar_one_or_none()
            if commit_event:
                commit_event.status = "failed"
                await session.commit()


@celery_app.task
def run_commit_review(commit_event_id: str):
    asyncio.run(_process_commit_review(commit_event_id))
