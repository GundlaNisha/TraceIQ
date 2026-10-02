from __future__ import annotations

import logging
import uuid
from typing import Any, Optional
from sqlalchemy import select

from app.db.session import get_worker_session
from app.modules.agent.models.agent_models import (
    AgentActionApproval,
    AgentMessage,
    AgentSession,
)
from app.modules.agent.services.streamer import publish_agent_event
from app.modules.agent.tools.codebase_tools import (
    search_code_symbols_fn,
    semantic_code_search_fn,
)
from app.modules.agent.tools.impact_tools import get_blast_radius_fn
from app.modules.agent.tools.requirement_tools import fetch_requirement_details_fn
from app.modules.agent.tools.review_tools import (
    audit_diff_standards_fn,
    audit_missing_tests_fn,
)
from app.workers.celery_app import celery_app
from app.workers.runner import run_async

logger = logging.getLogger(__name__)


async def _run_deep_code_exploration_async(
    session_id: str,
    workspace_id: str,
    repository_id: str,
    requirement_id: Optional[str] = None,
    query: str = "",
) -> dict[str, Any]:
    """Asynchronous background worker execution for deep codebase exploration."""
    logger.info(f"Starting deep code exploration for session {session_id}")
    await publish_agent_event(
        session_id=session_id,
        event_type="status",
        data={"message": "🔍 Exploring repository AST symbols and semantic embeddings...", "phase": "exploring"},
    )

    async with get_worker_session() as db:
        try:
            # 1. Fetch requirement details if linked
            req_info: Optional[dict[str, Any]] = None
            if requirement_id:
                req_info = await fetch_requirement_details_fn(requirement_id, db=db)

            effective_query = query
            if req_info and req_info.get("title"):
                effective_query = f"{req_info['title']} {req_info.get('text', '')[:200]}"
            if not effective_query:
                effective_query = "router handler service controller"

            # 2. Search symbols & semantic chunks
            symbols = await search_code_symbols_fn(
                repository_id=repository_id,
                query=effective_query,
                limit=10,
                db=db,
            )
            chunks = await semantic_code_search_fn(
                repository_id=repository_id,
                query=effective_query,
                top_k=5,
                db=db,
            )

            # 3. Build candidate starting points
            starting_points: list[dict[str, Any]] = []
            if symbols:
                for sym in symbols[:4]:
                    sname = sym.get("symbol_name", "UnknownSymbol")
                    starting_points.append({
                        "file_path": sym.get("file_path", "app/main.py"),
                        "symbol_name": sname,
                        "symbol_type": sym.get("symbol_type", "function"),
                        "line_start": sym.get("start_line", 1),
                        "line_end": sym.get("end_line", 50),
                        "confidence": 0.90,
                        "reasoning": f"Symbol '{sname}' directly matched requirement search.",
                    })
            elif chunks:
                for ch in chunks[:3]:
                    starting_points.append({
                        "file_path": ch.get("file_path", "app/main.py"),
                        "symbol_name": ch.get("module_name") or "ModuleRoot",
                        "symbol_type": "module",
                        "line_start": ch.get("start_line", 1),
                        "line_end": ch.get("end_line", 40),
                        "confidence": 0.80,
                        "reasoning": "Semantic similarity match against requirement context.",
                    })
            else:
                starting_points.append({
                    "file_path": "backend/app/main.py",
                    "symbol_name": "app",
                    "symbol_type": "variable",
                    "line_start": 1,
                    "line_end": 50,
                    "confidence": 0.60,
                    "reasoning": "Primary application bootstrap router entrypoint.",
                })

            # 4. Compute blast radius
            seed_files = [sp["file_path"] for sp in starting_points if "file_path" in sp]
            impact_summary = await get_blast_radius_fn(
                repository_id=repository_id,
                seed_files=seed_files,
                db=db,
            )

            # 5. Record pending approval in database
            sess_uuid = uuid.UUID(session_id)
            approval = AgentActionApproval(
                session_id=sess_uuid,
                action_type="confirm_starting_point",
                payload={
                    "starting_points": starting_points,
                    "impact_summary": impact_summary,
                },
                status="pending",
            )
            db.add(approval)

            # Update session phase
            stmt = select(AgentSession).where(AgentSession.id == sess_uuid)
            res = await db.execute(stmt)
            sess = res.scalar_one_or_none()
            if sess:
                sess.current_phase = "awaiting_starting_point_approval"
                sess.context_data = {
                    **(sess.context_data or {}),
                    "starting_points": starting_points,
                    "impact_summary": impact_summary,
                }

            await db.commit()

            # 6. Stream approval request event to client
            await publish_agent_event(
                session_id=session_id,
                event_type="approval_request",
                data={
                    "approval_id": str(approval.id),
                    "action_type": "confirm_starting_point",
                    "starting_points": starting_points,
                    "impact_summary": impact_summary,
                },
            )

            return {
                "approval_id": str(approval.id),
                "starting_points": starting_points,
                "impact_summary": impact_summary,
            }

        except Exception as e:
            logger.exception(f"Deep code exploration failed: {e}")
            await db.rollback()
            await publish_agent_event(
                session_id=session_id,
                event_type="error",
                data={"error": str(e)},
            )
            raise


async def _run_full_review_suite_async(
    session_id: str,
    workspace_id: str,
    repository_id: str,
    modified_files: list[str],
    diff_text: Optional[str] = None,
) -> dict[str, Any]:
    """Asynchronous background worker execution for coding standards and test coverage gaps."""
    logger.info(f"Starting full review suite for session {session_id}")
    await publish_agent_event(
        session_id=session_id,
        event_type="status",
        data={"message": "🛡️ Auditing coding standards & scanning unit test coverage...", "phase": "reviewing"},
    )

    async with get_worker_session() as db:
        try:
            # 1. Audit Coding Standards
            sample_diff = diff_text or "\n".join([f"--- a/{fp}\n+++ b/{fp}\n@@ -1,5 +1,10 @@\n+# Changes" for fp in modified_files])
            standards_res = audit_diff_standards_fn(sample_diff)
            review_findings = standards_res.get("findings", [])

            # 2. Audit Missing Tests
            test_res = await audit_missing_tests_fn(
                repository_id=repository_id,
                modified_files=modified_files,
                db=db,
            )
            test_gaps = test_res.get("missing_coverage", [])

            # 3. Record pending approval in database
            sess_uuid = uuid.UUID(session_id)
            approval = AgentActionApproval(
                session_id=sess_uuid,
                action_type="confirm_review_standards",
                payload={
                    "review_findings": review_findings,
                    "test_gaps": test_gaps,
                },
                status="pending",
            )
            db.add(approval)

            # Update session phase
            stmt = select(AgentSession).where(AgentSession.id == sess_uuid)
            res = await db.execute(stmt)
            sess = res.scalar_one_or_none()
            if sess:
                sess.current_phase = "awaiting_pr_approval"
                sess.context_data = {
                    **(sess.context_data or {}),
                    "review_findings": review_findings,
                    "test_gaps": test_gaps,
                }

            await db.commit()

            # 4. Stream approval request event to client
            await publish_agent_event(
                session_id=session_id,
                event_type="approval_request",
                data={
                    "approval_id": str(approval.id),
                    "action_type": "confirm_review_standards",
                    "review_findings": review_findings,
                    "test_gaps": test_gaps,
                },
            )

            return {
                "approval_id": str(approval.id),
                "review_findings": review_findings,
                "test_gaps": test_gaps,
            }

        except Exception as e:
            logger.exception(f"Full review suite failed: {e}")
            await db.rollback()
            await publish_agent_event(
                session_id=session_id,
                event_type="error",
                data={"error": str(e)},
            )
            raise


@celery_app.task
def task_run_deep_code_exploration(
    session_id: str,
    workspace_id: str,
    repository_id: str,
    requirement_id: Optional[str] = None,
    query: str = "",
) -> None:
    run_async(
        _run_deep_code_exploration_async,
        session_id=session_id,
        workspace_id=workspace_id,
        repository_id=repository_id,
        requirement_id=requirement_id,
        query=query,
    )


@celery_app.task
def task_run_full_review_suite(
    session_id: str,
    workspace_id: str,
    repository_id: str,
    modified_files: list[str],
    diff_text: Optional[str] = None,
) -> None:
    run_async(
        _run_full_review_suite_async,
        session_id=session_id,
        workspace_id=workspace_id,
        repository_id=repository_id,
        modified_files=modified_files,
        diff_text=diff_text,
    )
