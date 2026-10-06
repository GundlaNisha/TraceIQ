"""Live GitHub PR diff fetching for the agent.

When a user references a PR (tag, ``PR #7``, ``#7``) the agent fetches the
actual patches via the installed GitHub App in the background — the user
should never have to paste diffs. Results are capped so a huge PR cannot
blow up LLM context or request time.
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

MAX_PR_FILES = 20
MAX_DIFF_CHARS = 15000


def parse_repo_full_name(repo_url: str | None, fallback_name: str | None = None) -> str | None:
    """Derive ``owner/repo`` from a clone URL or fall back to a bare name."""
    if repo_url:
        try:
            path = urlparse(repo_url).path.strip("/")
            if path.lower().endswith(".git"):
                path = path[:-4]
            parts = [p for p in path.split("/") if p]
            if len(parts) >= 2:
                return f"{parts[-2]}/{parts[-1]}"
        except Exception:
            pass
    if fallback_name and "/" in fallback_name:
        return fallback_name.strip()
    return None


def _fetch_sync(full_name: str, pr_number: int) -> dict[str, Any]:
    """Blocking PyGithub fetch (runs in a worker thread via asyncio.to_thread)."""
    from app.modules.github.services.auth import (
        get_github_client_for_installation,
        get_installation_id_for_repo,
    )

    installation_id = get_installation_id_for_repo(full_name)
    if not installation_id:
        return {"ok": False, "reason": "no_installation"}

    client = get_github_client_for_installation(installation_id)
    owner, repo_name = full_name.split("/", 1)
    repo = client.get_repo(f"{owner}/{repo_name}")
    try:
        pull = repo.get_pull(pr_number)
    except Exception:
        return {"ok": False, "reason": "pr_not_found"}

    files_out: list[dict[str, Any]] = []
    try:
        gh_files = pull.get_files()
    except Exception as e:
        logger.warning(f"Could not list files for PR #{pr_number} in {full_name}: {e}")
        return {"ok": False, "reason": "files_error"}

    total = 0
    truncated = False
    for f in gh_files:
        if len(files_out) >= MAX_PR_FILES:
            truncated = True
            break
        patch = getattr(f, "patch", None) or ""
        entry = {
            "file_path": f.filename,
            "status": getattr(f, "status", "modified"),
            "additions": getattr(f, "additions", 0),
            "deletions": getattr(f, "deletions", 0),
            "patch": patch,
        }
        files_out.append(entry)
        total += len(patch)
        if total >= MAX_DIFF_CHARS:
            truncated = True
            break

    diff_text = "\n".join(
        f"--- a/{e['file_path']}\n+++ b/{e['file_path']}\n{e['patch']}"
        for e in files_out
        if e["patch"]
    )[:MAX_DIFF_CHARS]

    return {
        "ok": True,
        "title": pull.title,
        "state": pull.state,
        "number": pr_number,
        "html_url": pull.html_url,
        "files": files_out,
        "file_paths": [e["file_path"] for e in files_out],
        "truncated": truncated,
        "diff_text": diff_text or None,
    }


async def fetch_pr_diff_from_github(
    repo_full_name: str | None, pr_number: int
) -> dict[str, Any]:
    """Fetch a PR's patches via the GitHub App. Never raises; returns ok/reason."""
    if not repo_full_name or pr_number <= 0:
        return {"ok": False, "reason": "no_repo"}
    try:
        return await asyncio.to_thread(_fetch_sync, repo_full_name, pr_number)
    except Exception as e:
        logger.warning(f"Live PR fetch failed for {repo_full_name}#{pr_number}: {e}")
        return {"ok": False, "reason": f"error: {e!s}"}


_PR_PATTERNS = (
    re.compile(r"(?:\bPR\b|pull request)\s*#?\s*(\d{1,6})", re.IGNORECASE),
    re.compile(r"#(\d{1,6})\b"),
)


def extract_pr_numbers(text: str) -> list[int]:
    """Extract referenced PR numbers (``PR #7``, ``#7``) preserving order."""
    found: list[int] = []
    for pat in _PR_PATTERNS:
        for m in pat.findall(text or ""):
            try:
                n = int(m)
            except ValueError:
                continue
            if n > 0 and n not in found:
                found.append(n)
    return found[:3]
