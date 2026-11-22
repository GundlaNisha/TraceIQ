"""
Autonomous PR-to-Requirement Matching & JIT Resolution Service.

Resolves a Requirement grounding for any GitHub PR through a 4-layer resolution strategy:
1. Candidate Jira Key Extraction (PR Title, Branch Name/Ref, PR Body)
2. Database Match -> Existing Requirement with matching jira_issue_key
3. JIT Jira Cloud Import -> If Jira issue exists on Jira Cloud but not yet imported into TraceIQ
4. Fallback -> Repository default requirement or most recent active requirement
5. Autonomous Requirement Synthesis -> Creates an autonomous Requirement specification from PR Title & Body
"""

from __future__ import annotations

import logging
import re
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.jira.services.jira_service import (
    get_jira_integration,
    import_jira_issue,
)
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.requirement.services.req_service import create_requirement

logger = logging.getLogger(__name__)

# Standard Jira project issue key pattern (e.g. PROJ-123, CORE-45, RES_AI-999)
JIRA_KEY_REGEX = re.compile(r"\b([A-Z][A-Z0-9_]{1,10}-\d+)\b", re.IGNORECASE)

# Ignored common false positive prefixes that resemble Jira keys
IGNORED_PREFIXES = {
    "UTF", "SHA", "HTTP", "HTTPS", "ISO", "RFC", "IPV", "MD", "PR", "CVE", "GH"
}


def extract_jira_keys(text: str) -> list[str]:
    """
    Extract unique Jira issue keys from text (case-insensitive, returned upper-cased).
    Filters out common false positive patterns.
    """
    if not text:
        return []

    found = JIRA_KEY_REGEX.findall(text)
    keys: list[str] = []
    seen: set[str] = set()

    for raw_key in found:
        key = raw_key.upper().strip()
        prefix = key.split("-")[0]
        if prefix in IGNORED_PREFIXES:
            continue
        if key not in seen:
            seen.add(key)
            keys.append(key)

    return keys


async def resolve_requirement_for_pr(
    db: AsyncSession,
    repository: Repository,
    pr_title: str,
    pr_body: str = "",
    head_ref: str = "",
    pr_number: int = 0,
) -> tuple[Requirement, str]:
    """
    Autonomously resolves, imports, or synthesizes a Requirement for a Pull Request.

    Returns:
        tuple[Requirement, resolution_method]
        where resolution_method is one of:
        - "exact_jira_match"
        - "jit_jira_import"
        - "repo_default"
        - "active_requirement"
        - "synthesized_from_pr"
    """
    # 1. Extract Jira keys in priority order: Title -> Branch/Head Ref -> PR Body
    candidate_keys: list[str] = []
    seen_keys: set[str] = set()

    for source_text in (pr_title, head_ref, pr_body):
        for k in extract_jira_keys(source_text):
            if k not in seen_keys:
                seen_keys.add(k)
                candidate_keys.append(k)

    logger.info(
        f"Resolving requirement for PR #{pr_number} in repo {repository.name} (extracted keys: {candidate_keys})"
    )

    # 2. Check if any candidate Jira key already exists in DB for this repo or workspace
    if candidate_keys:
        # Check repo first
        stmt = (
            select(Requirement)
            .where(
                Requirement.repository_id == repository.id,
                Requirement.jira_issue_key.in_(candidate_keys),
            )
            .order_by(Requirement.updated_at.desc())
        )
        res = await db.execute(stmt)
        matched_req = res.scalars().first()
        if matched_req:
            logger.info(
                f"Matched existing requirement {matched_req.id} (Jira {matched_req.jira_issue_key}) for PR #{pr_number}"
            )
            return matched_req, "exact_jira_match"

        # Check workspace wide
        if repository.workspace_id:
            stmt_ws = (
                select(Requirement)
                .where(
                    Requirement.workspace_id == repository.workspace_id,
                    Requirement.jira_issue_key.in_(candidate_keys),
                )
                .order_by(Requirement.updated_at.desc())
            )
            res_ws = await db.execute(stmt_ws)
            matched_ws_req = res_ws.scalars().first()
            if matched_ws_req:
                logger.info(
                    f"Matched workspace requirement {matched_ws_req.id} (Jira {matched_ws_req.jira_issue_key}) for PR #{pr_number}"
                )
                return matched_ws_req, "exact_jira_match"

        # 3. JIT Jira Cloud Auto-Import: Key detected in PR but not yet imported into TraceIQ
        try:
            integration = await get_jira_integration(
                db, repository.user_id, repository.workspace_id
            )
            if integration and integration.is_active:
                target_key = candidate_keys[0]
                logger.info(
                    f"Attempting JIT Jira import for issue {target_key} on repo {repository.id}"
                )
                import_res = await import_jira_issue(
                    db=db,
                    user_id=repository.user_id,
                    workspace_id=repository.workspace_id,
                    repo_id=repository.id,
                    issue_key=target_key,
                )
                imported_req = await db.get(Requirement, import_res.requirement_id)
                if imported_req:
                    logger.info(
                        f"Successfully JIT-imported Jira issue {target_key} as requirement {imported_req.id}"
                    )
                    return imported_req, "jit_jira_import"
        except Exception as jit_err:
            logger.warning(
                f"JIT Jira import skipped/failed for keys {candidate_keys}: {jit_err!s}"
            )

    # 4. Check repository configured default requirement
    if repository.default_requirement_id:
        def_res = await db.execute(
            select(Requirement).where(Requirement.id == repository.default_requirement_id)
        )
        default_req = def_res.scalar_one_or_none()
        if default_req:
            logger.info(
                f"Using repository default requirement {default_req.id} for PR #{pr_number}"
            )
            return default_req, "repo_default"

    # 5. Check active requirements in repository
    active_res = await db.execute(
        select(Requirement)
        .where(Requirement.repository_id == repository.id)
        .order_by(Requirement.updated_at.desc())
        .limit(1)
    )
    active_req = active_res.scalar_one_or_none()
    if active_req:
        logger.info(
            f"Using active requirement {active_req.id} for PR #{pr_number}"
        )
        return active_req, "active_requirement"

    # 6. Autonomous Requirement Synthesis Fallback
    # When no requirements or Jira tickets exist, generate an autonomous PR specification
    safe_title = (pr_title or f"Pull Request #{pr_number}").strip()
    clean_body = (pr_body or "").strip()

    synth_title = f"[PR #{pr_number}] {safe_title}" if pr_number else safe_title
    if clean_body:
        spec_text = (
            f"## Autonomous PR Requirement Specification\n\n"
            f"**Pull Request:** #{pr_number} — {safe_title}\n"
            f"**Source Branch:** `{head_ref or 'feature'}`\n\n"
            f"### Acceptance Criteria & Description\n"
            f"{clean_body}\n"
        )
    else:
        spec_text = (
            f"## Autonomous PR Requirement Specification\n\n"
            f"**Pull Request:** #{pr_number} — {safe_title}\n"
            f"**Source Branch:** `{head_ref or 'feature'}`\n\n"
            f"### Automated Scope & Grounding\n"
            f"This requirement was autonomously synthesized by TraceIQ from Pull Request #{pr_number} "
            f"to establish semantic grounding, AST blast-radius boundaries, and automated code review compliance."
        )

    logger.info(
        f"Synthesizing autonomous requirement for PR #{pr_number} ({safe_title}) in repo {repository.id}"
    )
    synthesized_req = await create_requirement(
        db=db,
        user_id=repository.user_id,
        repository_id=repository.id,
        title=synth_title,
        text=spec_text,
        workspace_id=repository.workspace_id,
    )

    # Optionally set as default if repo has none
    if not repository.default_requirement_id:
        repository.default_requirement_id = synthesized_req.id
        await db.commit()

    return synthesized_req, "synthesized_from_pr"
