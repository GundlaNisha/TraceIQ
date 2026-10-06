from __future__ import annotations

import logging
from typing import Any, Optional
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.types import interrupt
from sqlalchemy import func, select

from app.db.session import AsyncSessionLocal
from app.modules.agent.graphs.state import AgentState
from app.modules.agent.tools.codebase_tools import (
    read_source_file_snippet_fn,
    search_code_symbols_fn,
    semantic_code_search_fn,
)
from app.modules.agent.tools.impact_tools import (
    find_downstream_dependents_fn,
    get_blast_radius_fn,
)
from app.modules.agent.tools.requirement_tools import fetch_requirement_details_fn
from app.modules.agent.tools.review_tools import (
    audit_diff_standards_fn,
    audit_missing_tests_fn,
)

from app.ai.providers.multi_provider import ai_router

logger = logging.getLogger(__name__)


def _extract_intent_from_text(text: str) -> str:
    """Classifies user intent from natural language prompts using rule heuristics."""
    lower = text.lower()
    if any(k in lower for k in ["start", "starting point", "where to start", "where should i", "find code", "explore", "implement", "jira", "requirement", "story"]):
        return "explore"
    if any(k in lower for k in ["pre-review", "prereview", "review", "audit", "standards", "test gap", "missing test", "tests", "coverage"]):
        return "review"
    if any(k in lower for k in ["draft pr", "pr draft", "pull request", "generate pr", "pr description"]):
        return "draft_pr"
    return "chat"


async def _determine_user_intent(last_human_text: str, current_phase: str) -> str:
    """Classifies user intent using MultiProviderRouter with fast fallback heuristics."""
    if not last_human_text or not last_human_text.strip():
        return "chat"

    lower = last_human_text.lower().strip()
    # Direct high-confidence phrase matches
    if any(k in lower for k in ["draft pr", "pr draft", "generate pr", "pr description"]):
        return "draft_pr"
    if any(k in lower for k in ["pre-review", "prereview", "audit standards", "test gap", "audit diff"]):
        return "review"
    if any(k in lower for k in ["where to start", "find starting point", "starting point"]):
        return "explore"

    # MultiProviderRouter LLM Classification for diverse or conversational phrasings
    try:
        classification_prompt = [
            {
                "role": "system",
                "content": (
                    "You are a routing intent classifier for TraceIQ AI Coding Agent.\n"
                    "Classify the user message into one of four actions:\n"
                    "- explore: User specifically asks where to start implementing code, finding entrypoints, or locating files for a task/requirement.\n"
                    "- review: User asks to audit code against coding standards or check missing test coverage.\n"
                    "- draft_pr: User asks to draft a pull request description.\n"
                    "- chat: User is asking follow-up questions, asking for code explanations ('why?', 'explain line X'), discussing architecture, asking general programming questions, or conversing.\n\n"
                    "Reply ONLY with the exact word: explore, review, draft_pr, or chat."
                ),
            },
            {"role": "user", "content": last_human_text},
        ]
        decision = await ai_router.chat_complete(classification_prompt, temperature=0.0, max_tokens=15)
        decision_clean = decision.strip().lower()
        if "explore" in decision_clean:
            return "explore"
        if "review" in decision_clean:
            return "review"
        if "draft" in decision_clean or "pr" in decision_clean:
            return "draft_pr"
        return "chat"
    except Exception as e:
        logger.warning(f"AI intent classification error, using fallback heuristics: {e}")
        return _extract_intent_from_text(last_human_text)


async def supervisor_node(state: AgentState) -> dict[str, Any]:
    """
    Supervisor Agent Node:
    Analyzes developer intent, inspects previous Human-in-the-Loop approval transitions,
    and orchestrates sub-agents accordingly.
    """
    messages = state.get("messages", [])
    approval_status = state.get("approval_status")
    current_phase = state.get("current_phase", "idle")

    # 1. Handle Human-in-the-Loop approval transitions
    if approval_status == "approved":
        if current_phase in ("awaiting_starting_point_approval", "starting_points_approved"):
            return {
                "approval_status": None,
                "current_phase": "reviewing",
                "next_step": "pre_review",
                "messages": [
                    AIMessage(
                        content="✅ **Starting Point Confirmed.** Proceeding with static coding standards audit, blast radius dependency mapping, and unit test gap analysis..."
                    )
                ],
            }
        elif current_phase in ("awaiting_pr_approval", "review_approved"):
            return {
                "approval_status": None,
                "current_phase": "drafting_pr",
                "next_step": "pr_drafter",
                "messages": [
                    AIMessage(
                        content="✅ **Pre-Review Audit Acknowledged.** Generating structured, requirement-linked Pull Request description draft..."
                    )
                ],
            }
    elif approval_status == "rejected":
        feedback = state.get("user_feedback") or "No specific feedback provided."
        return {
            "approval_status": None,
            "current_phase": "idle",
            "next_step": "completed",
            "messages": [
                AIMessage(
                    content=f"⚠️ **Action Rejected by Developer.**\n\n*Feedback received:* \"{feedback}\"\n\nWould you like me to refine the search with different keywords, inspect specific files, or assist with something else?"
                )
            ],
        }

    # 2. Extract latest user message
    last_human_text = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_human_text = str(msg.content)
            break

    intent = await _determine_user_intent(last_human_text, current_phase)

    if intent == "explore":
        return {
            "current_phase": "exploring",
            "next_step": "code_explorer",
        }
    elif intent == "review":
        return {
            "current_phase": "reviewing",
            "next_step": "pre_review",
        }
    elif intent == "draft_pr":
        return {
            "current_phase": "drafting_pr",
            "next_step": "pr_drafter",
        }
    else:
        # Route to conversational chat agent node
        return {
            "current_phase": "chatting",
            "next_step": "conversational_chat",
        }


async def code_explorer_node(state: AgentState) -> dict[str, Any]:
    """
    Code Explorer & Starting Point Agent Node:
    Performs symbol AST search, semantic vector retrieval, and initial blast radius calculations
    to surface suggested starting points for the developer.

    Never fabricates results: with no bound repository it asks for one, with an
    empty index it says the repo is not indexed yet, and with zero matches it
    says so instead of inventing files.
    """
    repository_id = state.get("repository_id")
    requirement_id = state.get("requirement_id")

    if not repository_id:
        return {
            "starting_points": [],
            "impact_summary": {},
            "pending_approval": None,
            "current_phase": "needs_repository",
            "next_step": "completed",
            "messages": [AIMessage(content=(
                "### 🔎 Which repository should I analyze?\n\n"
                "I couldn't tell which repository you mean, so I won't guess. "
                "Pick it from the **repository dropdown**, tag it with `@owner/repo-name`, "
                "or tell me the exact name — then ask me again."
            ))],
        }

    # 1. Retrieve requirement specification if linked
    req_details: Optional[dict[str, Any]] = None
    if requirement_id:
        req_details = await fetch_requirement_details_fn(requirement_id)

    # 2. Verify the repository actually has an index (files + symbols)
    from app.modules.indexing.models.index_models import RepositoryFile
    from app.modules.repository.models.repo import Repository

    repo_name = str(repository_id)
    indexed_files = 0
    try:
        async with AsyncSessionLocal() as _s:
            repo_row = await _s.get(Repository, repository_id)
            if repo_row is not None:
                repo_name = repo_row.name
            indexed_files = (
                await _s.execute(
                    select(func.count())
                    .select_from(RepositoryFile)
                    .where(RepositoryFile.repository_id == repository_id)
                )
            ).scalar_one()
    except Exception as e:
        logger.warning(f"Could not check index status for repo {repository_id}: {e}")

    if not indexed_files:
        return {
            "starting_points": [],
            "impact_summary": {},
            "pending_approval": None,
            "current_phase": "needs_indexing",
            "next_step": "completed",
            "messages": [AIMessage(content=(
                f"### 📂 Repository `{repo_name}` isn't indexed yet\n\n"
                "I found the repository, but its code index is empty — so I have nothing to search. "
                "There is no point in me guessing files.\n\n"
                "**Next step:** open **Repositories →** your repo **→ Sync / Re-index**, wait for indexing "
                "to finish, then ask me again."
            ))],
        }

    # 3. Extract search query from requirement or user message
    query_text = ""
    if req_details and req_details.get("title"):
        query_text = f"{req_details.get('title')} {req_details.get('description', '')[:200]}"
    else:
        for msg in reversed(state.get("messages", [])):
            if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
                query_text = str(msg.content)
                break

    if not query_text:
        query_text = "service handler entrypoint controller"

    # 4. Search symbols and semantic code chunks
    symbols_found = await search_code_symbols_fn(
        repository_id=repository_id,
        query=query_text,
        limit=8,
    )
    semantic_chunks = await semantic_code_search_fn(
        repository_id=repository_id,
        query=query_text,
        top_k=5,
    )

    # 5. Formulate suggested starting points from REAL results only
    starting_points: list[dict[str, Any]] = []

    if symbols_found:
        for item in symbols_found[:4]:
            sym_name = item.get("symbol_name") or item.get("name") or "UnknownSymbol"
            starting_points.append({
                "file_path": item.get("file_path", "unknown"),
                "symbol_name": sym_name,
                "symbol_type": item.get("symbol_type", "function"),
                "line_start": item.get("start_line", 1),
                "line_end": item.get("end_line", 50),
                "confidence": 0.7,
                "reasoning": f"Symbol '{sym_name}' matched keywords in requirement context.",
            })
    if semantic_chunks:
        for chunk in semantic_chunks[:3]:
            fpath = chunk.get("file_path", "unknown")
            if any(sp["file_path"] == fpath for sp in starting_points):
                continue
            starting_points.append({
                "file_path": fpath,
                "symbol_name": chunk.get("module_name") or "ModuleRoot",
                "symbol_type": "module",
                "line_start": chunk.get("start_line", 1),
                "line_end": chunk.get("end_line", 40),
                "confidence": round(float(chunk.get("similarity", 0.75)), 2),
                "reasoning": "High semantic similarity score to requirement context.",
            })

    if not starting_points:
        return {
            "starting_points": [],
            "impact_summary": {},
            "pending_approval": None,
            "current_phase": "exploring",
            "next_step": "completed",
            "messages": [AIMessage(content=(
                f"### 🔍 No matches in `{repo_name}`\n\n"
                f"I searched the indexed code for `{query_text[:120]}` but found no matching symbols or chunks.\n\n"
                "Try rephrasing (e.g. name a file, function, or feature area), or tag a requirement so I can ground the search."
            ))],
        }

    # 6. Compute initial blast radius from real seeds only
    seed_files = [sp["file_path"] for sp in starting_points if sp.get("file_path")]
    impact_data = await get_blast_radius_fn(
        repository_id=repository_id,
        seed_files=seed_files,
    )
    if not isinstance(impact_data, dict):
        impact_data = {"risk_level": "low", "impacted_files_count": 0}

    # 7. Format explanation message
    sp_lines = []
    for idx, sp in enumerate(starting_points, start=1):
        sp_lines.append(
            f"{idx}. 📄 `{sp['file_path']}` — **{sp['symbol_name']}** (Lines {sp['line_start']}–{sp['line_end']})\n"
            f"   *Confidence:* `{int(sp['confidence'] * 100)}%` | *Reasoning:* {sp['reasoning']}"
        )

    formatted_points = "\n".join(sp_lines)
    summary_text = (
        f"### 📍 Suggested Starting Points (`{repo_name}`)\n\n"
        f"I analyzed the indexed codebase against your requirement and identified the following candidate starting points:\n\n"
        f"{formatted_points}\n\n"
        f"**Estimated Blast Radius:** `{str(impact_data.get('risk_level', 'low')).upper()}` risk "
        f"({impact_data.get('impacted_files_count', 0)} potentially affected files).\n\n"
        f"---\n"
        f"✋ **Human-in-the-Loop Confirmation Required:**\n"
        f"Please verify these locations. Click **'Confirm & Proceed'** to continue to dependency impact and coding standards audits, or **'Reject / Revise'** to specify different files."
    )

    pending_approval = {
        "action_type": "confirm_starting_point",
        "payload": {
            "starting_points": starting_points,
            "impact_summary": impact_data,
        },
        "status": "pending",
    }

    return {
        "starting_points": starting_points,
        "impact_summary": impact_data,
        "pending_approval": pending_approval,
        "current_phase": "awaiting_starting_point_approval",
        "next_step": "hitl_starting_point",
        "messages": [AIMessage(content=summary_text)],
    }


async def hitl_starting_point_node(state: AgentState) -> dict[str, Any]:
    """
    Human-in-the-Loop Checkpoint 1: Suggested Starting Point Approval.
    Pauses LangGraph execution using interrupt() until developer approves or rejects.
    """
    approval_data = state.get("pending_approval") or {
        "action_type": "confirm_starting_point",
        "payload": {
            "starting_points": state.get("starting_points", []),
            "impact_summary": state.get("impact_summary", {}),
        },
        "status": "pending",
    }

    # Pause execution for human review
    user_decision: dict[str, Any] = interrupt(approval_data)

    status = user_decision.get("status", "approved")
    feedback = user_decision.get("user_feedback")

    if status == "approved":
        return {
            "approval_status": "approved",
            "user_feedback": feedback,
            "pending_approval": None,
            "current_phase": "starting_points_approved",
            "next_step": "pre_review",
        }
    else:
        return {
            "approval_status": "rejected",
            "user_feedback": feedback,
            "pending_approval": None,
            "current_phase": "starting_points_rejected",
            "next_step": "completed",
        }


async def pre_review_node(state: AgentState) -> dict[str, Any]:
    """
    Standards & Pre-Review Agent Node:
    Audits a REAL developer-supplied diff (pasted ```diff fence or tagged PR
    with stored patches) for coding standards, security vulnerabilities,
    and missing unit test coverage. Never invents findings: with no diff it
    asks for one instead of auditing fabricated code.
    """
    import re as _re

    repository_id = state.get("repository_id")
    starting_points = state.get("starting_points", [])
    diff_text = (state.get("diff_text") or "").strip()

    if not diff_text:
        return {
            "review_findings": [],
            "test_gaps": [],
            "pending_approval": None,
            "current_phase": "needs_diff",
            "next_step": "completed",
            "messages": [AIMessage(content=(
                "### 🛡️ I need your diff to pre-review\n\n"
                "I can't audit code I can't see — and I won't pretend a guess is an audit.\n\n"
                "Please do one of:\n"
                "- Paste the diff in a fenced block (```diff ... ```), or\n"
                "- Tag the pull request with `@` from the mention menu (I read its stored patches), or\n"
                "- Tell me the file paths + line ranges to inspect."
            ))],
        }

    # 1. Audit the real diff against coding standards
    standards_result = audit_diff_standards_fn(diff_text=diff_text)
    review_findings = standards_result.get("findings", [])

    # 2. Derive touched files from unified-diff headers for test-gap mapping
    touched_files = _re.findall(r"^\+\+\+\s+b/(.+)$", diff_text, _re.MULTILINE)
    if not touched_files:
        touched_files = [sp["file_path"] for sp in starting_points if sp.get("file_path")]

    # 3. Audit Missing Unit Test Gaps against the touched files
    test_result = await audit_missing_tests_fn(
        repository_id=repository_id,
        modified_files=touched_files,
    )
    test_gaps = test_result.get("missing_coverage", [])

    # 3. Format Review Message
    findings_md = []
    for f in review_findings:
        f_file = f.get("file") or f.get("file_path") or (touched_files[0] if touched_files else "unknown file")
        f_line = f.get("line", f.get("line_number", "?"))
        f_fix = f.get("recommendation") or "See rule guidance for this file."
        findings_md.append(
            f"- ⚠️ **[{f.get('severity', 'medium').upper()}]** `{f_file}` (L{f_line}): {f.get('message')}\n"
            f"  *Fix:* {f_fix}"
        )

    tests_md = []
    for t in test_gaps:
        tests_md.append(
            f"- 🧪 `{t.get('file_path')}`: {t.get('recommendation', 'Missing unit test suite')}"
        )

    summary_text = (
        f"### 🛡️ Pre-Review & Test Gap Analysis\n\n"
        f"**Coding Standards & Security Findings:**\n"
        + ("\n".join(findings_md) if findings_md else "No standards violations detected.")
        + f"\n\n**Missing Unit Test Coverage:**\n"
        + ("\n".join(tests_md) if tests_md else "All associated test suites are present.")
        + f"\n\n---\n"
        f"✋ **Human-in-the-Loop Confirmation Required:**\n"
        f"Please inspect the pre-review findings and missing test coverage. Click **'Generate PR Draft'** to synthesize the requirement-linked Pull Request description."
    )

    pending_approval = {
        "action_type": "confirm_review_standards",
        "payload": {
            "review_findings": review_findings,
            "test_gaps": test_gaps,
        },
        "status": "pending",
    }

    return {
        "review_findings": review_findings,
        "test_gaps": test_gaps,
        "pending_approval": pending_approval,
        "current_phase": "awaiting_pr_approval",
        "next_step": "hitl_pre_review",
        "messages": [AIMessage(content=summary_text)],
    }


async def hitl_pre_review_node(state: AgentState) -> dict[str, Any]:
    """
    Human-in-the-Loop Checkpoint 2: Standards & Pre-Review Acknowledgment.
    Pauses LangGraph execution until developer confirms the pre-review audit.
    """
    approval_data = state.get("pending_approval") or {
        "action_type": "confirm_review_standards",
        "payload": {
            "review_findings": state.get("review_findings", []),
            "test_gaps": state.get("test_gaps", []),
        },
        "status": "pending",
    }

    user_decision: dict[str, Any] = interrupt(approval_data)

    status = user_decision.get("status", "approved")
    feedback = user_decision.get("user_feedback")

    if status == "approved":
        return {
            "approval_status": "approved",
            "user_feedback": feedback,
            "pending_approval": None,
            "current_phase": "review_approved",
            "next_step": "pr_drafter",
        }
    else:
        return {
            "approval_status": "rejected",
            "user_feedback": feedback,
            "pending_approval": None,
            "current_phase": "review_rejected",
            "next_step": "completed",
        }


async def pr_drafter_node(state: AgentState) -> dict[str, Any]:
    """
    PR Drafter & Traceability Agent Node:
    Synthesizes requirement context, starting point modifications, impact findings,
    and review checklists into a production-ready GitHub PR description.
    """
    requirement_id = state.get("requirement_id") or "REQ-001"
    starting_points = state.get("starting_points", [])
    impact_summary = state.get("impact_summary", {})
    review_findings = state.get("review_findings", [])
    test_gaps = state.get("test_gaps", [])

    req_title = ""
    req_text = ""
    if state.get("requirement_id"):
        try:
            _req = await fetch_requirement_details_fn(state["requirement_id"])
            if _req:
                req_title = _req.get("title", "")
                req_text = (_req.get("text", "") or "")[:800]
        except Exception as e:
            logger.warning(f"Could not fetch requirement for PR draft: {e}")

    pr_title = f"feat({str(requirement_id).lower()}): implement requirement changes with verified blast radius"

    # Compile files list
    files_list_md = "\n".join([f"- `{sp['file_path']}`: {sp.get('reasoning', 'Core logic entrypoint')}" for sp in starting_points]) or "- No specific files specified"

    # Compile checklist
    checklist_md = (
        "- [x] Requirement acceptance criteria mapped and verified\n"
        "- [x] Blast radius caller/callee analysis completed\n"
        "- [ ] Coding standards remediation applied for flagged items\n"
        "- [ ] Missing unit tests implemented for target functions"
    )

    # Try an LLM-drafted description grounded in real context; fall back to template.
    pr_markdown: str | None = None
    try:
        _draft_prompt = [
            {"role": "system", "content": (
                "You are TraceIQ PR Drafter. Write a concise, production-ready GitHub pull request "
                "description in Markdown with these sections: ## Summary, ## Changes, "
                "## Blast Radius & Risk, ## Testing Checklist, ## Rollback Plan. "
                "Ground every claim ONLY in the context provided. Never invent file names, "
                "metrics, or test results. Keep it under 400 words."
            )},
            {"role": "user", "content": (
                f"Requirement: {req_title} ({requirement_id})\n{req_text}\n\n"
                f"Starting points: {files_list_md}\n\n"
                f"Risk: {impact_summary.get('risk_level', 'unknown')} "
                f"({impact_summary.get('impacted_files_count', len(starting_points))} files)\n"
                f"Standards findings: {len(review_findings)}, test gaps: {len(test_gaps)}."
            )},
        ]
        _llm_md = await ai_router.chat_complete(_draft_prompt, temperature=0.3, max_tokens=1200)
        if _llm_md and len(_llm_md.strip()) > 40:
            pr_markdown = (
                f"## 📌 Linked Requirement\n**Jira / Requirement ID:** `{requirement_id}`\n\n"
                + _llm_md.strip()
                + "\n\n---\n*Generated automatically by TraceIQ AI Code Impact & Review Assistant.*"
            )
    except Exception as e:
        logger.warning(f"LLM PR drafting failed, using template fallback: {e}")

    if not pr_markdown:
        pr_markdown = f"""## 📌 Linked Requirement
**Jira / Requirement ID:** `{requirement_id}`

### 📝 Summary of Changes
This pull request introduces changes addressing requirement **{requirement_id}**. All modifications have undergone automated pre-review and blast radius impact assessment.

### 🔍 Impacted Files & Starting Points
{files_list_md}

### 💥 Blast Radius & Risk Assessment
- **Risk Level:** `{impact_summary.get('risk_level', 'medium').upper()}`
- **Impacted Files Count:** `{impact_summary.get('impacted_files_count', len(starting_points))}`
- **Downstream Callers:** {', '.join(impact_summary.get('affected_callers', ['N/A']))}
- **Dependent Routes:** {', '.join(impact_summary.get('downstream_routes', ['N/A']))}

### 🛡️ Pre-Review Standards & Missing Tests
- **Standards Findings Identified:** {len(review_findings)} item(s)
- **Test Gaps Flagged:** {len(test_gaps)} function(s) require supplementary coverage

### ✅ Developer Verification Checklist
{checklist_md}

---
*Generated automatically by TraceIQ AI Code Impact & Review Assistant.*
"""

    pr_draft = {
        "title": pr_title,
        "linked_requirement": requirement_id,
        "summary": f"Automated PR draft for requirement {requirement_id}",
        "raw_markdown": pr_markdown,
    }

    message_text = (
        f"### 📝 Draft Pull Request Description Generated\n\n"
        f"**PR Title:** `{pr_title}`\n\n"
        f"```markdown\n{pr_markdown}\n```\n\n"
        f"You can copy this markdown directly into GitHub or edit it inline in the **PR Draft Preview** tab on the right."
    )

    return {
        "pr_draft": pr_draft,
        "current_phase": "pr_drafted",
        "next_step": "completed",
        "messages": [AIMessage(content=message_text)],
    }


async def conversational_chat_node(state: AgentState) -> dict[str, Any]:
    """
    Conversational Chat Agent Node:
    Empowered by MultiProviderRouter (Gemini, OpenCode Zen, Groq).
    Provides deep, contextual, and multi-turn technical discussion,
    answering follow-up questions, clarifying architecture, explaining code,
    and acknowledging tagged @entities (Repositories, Requirements, PRs).
    """
    messages = state.get("messages", [])
    repository_id = state.get("repository_id")
    requirement_id = state.get("requirement_id")
    entity_context = state.get("entity_context")

    # 1. Extract latest user query
    last_human_text = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_human_text = str(msg.content)
            break

    if not last_human_text:
        last_human_text = "Hello! What can you do?"

    # 2. Gather relevant code snippets & symbols if repository is bound
    code_context_parts = []
    if repository_id:
        try:
            symbols = await search_code_symbols_fn(repository_id, last_human_text, limit=4)
            if symbols:
                sym_texts = [
                    f"- `{s['file_path']}`: {s['symbol_type']} **{s['symbol_name']}** (L{s['start_line']}-{s['end_line']})"
                    for s in symbols
                ]
                code_context_parts.append("### Code AST Symbols:\n" + "\n".join(sym_texts))

            chunks = await semantic_code_search_fn(repository_id, last_human_text, top_k=3)
            if chunks:
                chunk_texts = [
                    f"```\n# File: {c.get('file_path')}\n{c.get('content', '')[:400]}\n```"
                    for c in chunks
                ]
                code_context_parts.append("### Relevant Code Chunks:\n" + "\n".join(chunk_texts))
        except Exception as e:
            logger.warning(f"Error gathering codebase context for chat node: {e}")

    # 3. Retrieve linked requirement details if available
    req_context_str = ""
    if requirement_id:
        try:
            req_info = await fetch_requirement_details_fn(requirement_id)
            if req_info:
                req_context_str = (
                    f"Linked Requirement: {req_info.get('title')} ({req_info.get('jira_key') or 'Custom'})\n"
                    f"Specification: {req_info.get('description', '')[:600]}"
                )
        except Exception as e:
            logger.warning(f"Error fetching requirement details for chat node: {e}")

    # 4. Construct high-fidelity system prompt
    system_prompt = (
        "You are TraceIQ Senior AI Architect, an expert coding assistant with deep codebase context.\n"
        "You are assisting a software engineer in an interactive, multi-turn conversation.\n"
        "Guidelines:\n"
        "1. Provide clear, accurate, and deeply insightful technical responses formatted in GitHub Markdown.\n"
        "2. When explaining code, architecture, or design patterns, reference the provided code symbols and files.\n"
        "3. If the engineer is asking follow-up questions ('why?', 'explain line X', 'how does error handling work?'), maintain conversational continuity and reason step-by-step.\n"
        "4. If Human-in-the-Loop actions (such as starting point confirmation, standards audits, or drafting PRs) are relevant to the user's intent, guide them on how to trigger or approve them.\n"
        "5. Be concise, direct, and avoid robotic boilerplate."
    )

    context_blocks = []
    if req_context_str:
        context_blocks.append(f"=== LINKED REQUIREMENT ===\n{req_context_str}")
    if entity_context:
        context_blocks.append(f"=== TAGGED CONTEXT (@mentions) ===\n{entity_context}")
    if code_context_parts:
        context_blocks.append("=== CODEBASE CONTEXT ===\n" + "\n\n".join(code_context_parts))

    if context_blocks:
        system_prompt += "\n\n" + "\n\n".join(context_blocks)

    # 5. Format conversation turns for MultiProviderRouter
    llm_messages = [{"role": "system", "content": system_prompt}]
    for m in messages[-10:]:
        role = "user" if (isinstance(m, HumanMessage) or getattr(m, "type", "") == "human") else "assistant"
        llm_messages.append({"role": role, "content": str(m.content)})

    # 6. Dispatch through MultiProviderRouter (with Gemini, OpenCode Zen, and Groq failover!)
    try:
        response_text = await ai_router.chat_complete(llm_messages, temperature=0.3, max_tokens=2048)
    except Exception as e:
        logger.error(f"MultiProviderRouter failed in conversational_chat_node: {e}")
        response_text = (
            f"I encountered a temporary issue contacting the AI models: {e!s}.\n\n"
            "Please verify your API keys or check `/api/v1/health/ai`."
        )

    return {
        "current_phase": "chatting",
        "next_step": "completed",
        "messages": [AIMessage(content=response_text)],
    }
