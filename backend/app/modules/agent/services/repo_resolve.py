"""Natural-language entity resolution for agent chat.

Users often type ``@owner/repo`` or ``@repo-name`` as plain text instead of
picking an entry from the @-mention menu (which emits structured
``tagged_entities``). This module resolves those plain-text mentions to
workspace-scoped repositories / requirements so follow-up questions keep
working with the right context instead of falling back to dummy data.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement

# @token where token looks like owner/name, repo-name, name with dots/dashes.
_MENTION_RE = re.compile(r"@([A-Za-z0-9][A-Za-z0-9._/-]*[A-Za-z0-9])")
# Jira-style keys: PROJ-123
_JIRA_KEY_RE = re.compile(r"\b([A-Z][A-Z0-9]+-\d+)\b")
# Fenced code blocks (```...``` or ```diff...```) — used as pasted diffs.
_FENCED_BLOCK_RE = re.compile(r"```(?:diff|patch)?\s*\n(.*?)```", re.DOTALL)


def extract_mention_tokens(text: str) -> list[str]:
    """Return raw @-mention tokens from free text (deduped, order kept)."""
    seen: set[str] = set()
    tokens: list[str] = []
    for tok in _MENTION_RE.findall(text or ""):
        tok = tok.strip().rstrip(".,;:!?")
        if tok and tok not in seen and "@" not in tok:
            seen.add(tok)
            tokens.append(tok)
    return tokens


def extract_jira_keys(text: str) -> list[str]:
    """Return Jira-style issue keys (PROJ-123) from free text."""
    return list(dict.fromkeys(_JIRA_KEY_RE.findall(text or "")))


def extract_fenced_diff(text: str, min_lines: int = 2) -> str | None:
    """Return the largest fenced code block, used as a pasted diff candidate."""
    blocks = [b.strip("\n") for b in _FENCED_BLOCK_RE.findall(text or "")]
    blocks = [b for b in blocks if b.count("\n") + 1 >= min_lines]
    if not blocks:
        return None
    return max(blocks, key=len)


def _repo_scope(stmt, workspace_id: str | None, user_id: str):
    if workspace_id:
        try:
            ws_uuid = uuid.UUID(str(workspace_id))
            return stmt.where(Repository.workspace_id == ws_uuid)
        except ValueError:
            pass
    return stmt.where(Repository.user_id == str(user_id))


async def resolve_repository_from_text(
    db: AsyncSession,
    text: str,
    workspace_id: str | None,
    user_id: str,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    """Resolve a repository from plain-text @-mentions.

    Returns (unique_match | None, candidates). A unique match is a repo dict
    with id/name/repo_url/branch keys.
    """
    tokens = extract_mention_tokens(text)
    candidates: dict[str, dict[str, Any]] = {}
    for token in tokens:
        # Skip the structured @type:[id] menu syntax (handled by the router).
        if token.startswith(("repo:[", "req:[", "pr:[")):
            continue
        short = token.split("/")[-1]
        stmt = select(Repository)
        stmt = _repo_scope(stmt, workspace_id, user_id)
        stmt = stmt.where(
            or_(
                Repository.name.ilike(token),
                Repository.name.ilike(short),
                Repository.name.ilike(f"%{short}%"),
                Repository.repo_url.ilike(f"%{token}%"),
            )
        ).limit(10)
        rows = (await db.execute(stmt)).scalars().all()
        for r in rows:
            candidates[str(r.id)] = {
                "id": str(r.id),
                "name": r.name,
                "repo_url": r.repo_url,
                "branch": r.default_branch,
            }
    if len(candidates) == 1:
        return next(iter(candidates.values())), []
    return None, list(candidates.values())[:5]


async def resolve_requirement_from_text(
    db: AsyncSession,
    text: str,
    workspace_id: str | None,
    user_id: str,
) -> dict[str, Any] | None:
    """Resolve a requirement from a plain-text Jira key (e.g. PROJ-123)."""
    for key in extract_jira_keys(text):
        stmt = select(Requirement).where(Requirement.jira_issue_key == key)
        if workspace_id:
            try:
                stmt = stmt.where(Requirement.workspace_id == uuid.UUID(str(workspace_id)))
            except ValueError:
                pass
        row = (await db.execute(stmt.limit(1))).scalar_one_or_none()
        if row is not None:
            return {"id": str(row.id), "title": row.title, "jira_key": row.jira_issue_key}
    return None
