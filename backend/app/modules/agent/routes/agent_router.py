from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import Command
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.modules.agent.graphs.workflow import agent_graph
from app.modules.agent.models.agent_models import (
    AgentActionApproval,
    AgentMessage,
    AgentSession,
)
from app.modules.agent.schemas.agent_schemas import (
    AgentApprovalDecision,
    AgentApprovalResponse,
    AgentMessageCreate,
    AgentMessageResponse,
    AgentSessionCreate,
    AgentSessionResponse,
    AgentSessionUpdate,
)
from app.modules.agent.services.streamer import (
    publish_agent_event,
    subscribe_agent_events,
)
from app.modules.auth.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


@router.post("/sessions", response_model=AgentSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_agent_session(
    payload: AgentSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentSession:
    """Create a new conversational agent session bound to an active workspace."""
    session = AgentSession(
        workspace_id=payload.workspace_id,
        user_id=str(current_user.id),
        repository_id=payload.repository_id,
        requirement_id=payload.requirement_id,
        title=payload.title,
        status="active",
        current_phase="idle",
        context_data={},
    )
    db.add(session)
    await db.flush()

    # Pre-populate session with initial greeting and agent capabilities
    welcome_text = (
        "Hello! I am your **TraceIQ AI Code Impact & Review Assistant**.\n\n"
        "I feature strict **Human-in-the-Loop Governance** — I will analyze requirements, suggest starting points, audit coding standards, and draft PRs, but I never modify code or proceed without your confirmation.\n\n"
        "How can I help you today? You can select a Jira requirement from the top, or ask me something like:\n"
        "- *'Where should I start for requirement PROJ-102?'*\n"
        "- *'Audit my changes against coding standards and test coverage gaps'* \n"
        "- *'Draft a pull request description for my changes'*"
    )
    init_msg = AgentMessage(
        session_id=session.id,
        sender="agent",
        agent_role="supervisor",
        content=welcome_text,
        message_type="text",
        artifacts={},
    )
    db.add(init_msg)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions", response_model=list[AgentSessionResponse])
async def list_agent_sessions(
    workspace_id: uuid.UUID = Query(..., description="Active workspace ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AgentSession]:
    """List agent sessions for the authenticated user within the specified workspace."""
    stmt = (
        select(AgentSession)
        .where(
            AgentSession.workspace_id == workspace_id,
            AgentSession.user_id == str(current_user.id),
        )
        .order_by(AgentSession.updated_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/sessions/{session_id}")
async def get_agent_session_detail(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Retrieve full session detail including message history and pending action approvals."""
    stmt_sess = select(AgentSession).where(
        AgentSession.id == session_id,
        AgentSession.user_id == str(current_user.id),
    )
    result_sess = await db.execute(stmt_sess)
    session = result_sess.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent session not found")

    # Fetch messages
    stmt_msg = (
        select(AgentMessage)
        .where(AgentMessage.session_id == session_id)
        .order_by(AgentMessage.created_at.asc())
    )
    result_msg = await db.execute(stmt_msg)
    messages = result_msg.scalars().all()

    # Fetch active approvals
    stmt_app = (
        select(AgentActionApproval)
        .where(AgentActionApproval.session_id == session_id)
        .order_by(AgentActionApproval.created_at.desc())
    )
    result_app = await db.execute(stmt_app)
    approvals = result_app.scalars().all()

    return {
        "session": AgentSessionResponse.model_validate(session),
        "messages": [AgentMessageResponse.model_validate(m) for m in messages],
        "approvals": [AgentApprovalResponse.model_validate(a) for a in approvals],
        "pending_approval": AgentApprovalResponse.model_validate(approvals[0]) if approvals and approvals[0].status == "pending" else None,
    }


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_agent_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Delete an agent session and all associated messages and approvals."""
    stmt = select(AgentSession).where(
        AgentSession.id == session_id,
        AgentSession.user_id == str(current_user.id),
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent session not found")

    await db.delete(session)
    await db.commit()
    return {"deleted": True, "id": str(session_id)}


@router.post("/sessions/{session_id}/messages")
async def post_agent_message(
    session_id: uuid.UUID,
    payload: AgentMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Post a user message to the agent session and run LangGraph orchestration.
    Streams progress updates to the active SSE channel and records assistant responses.
    """
    stmt_sess = select(AgentSession).where(
        AgentSession.id == session_id,
        AgentSession.user_id == str(current_user.id),
    )
    result_sess = await db.execute(stmt_sess)
    session = result_sess.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent session not found")

    # 1. Save user message in DB
    user_msg = AgentMessage(
        session_id=session.id,
        sender="user",
        content=payload.content,
        message_type="text",
        artifacts={},
    )
    db.add(user_msg)
    await db.flush()

    # 2. Build LangChain message history
    stmt_history = (
        select(AgentMessage)
        .where(AgentMessage.session_id == session.id)
        .order_by(AgentMessage.created_at.asc())
    )
    res_history = await db.execute(stmt_history)
    history_records = res_history.scalars().all()

    langchain_messages = []
    for h in history_records[-15:]:
        if h.sender == "user":
            langchain_messages.append(HumanMessage(content=h.content))
        else:
            langchain_messages.append(AIMessage(content=h.content))

    config = {"configurable": {"thread_id": str(session.id)}}

    # Initial graph state
    current_context = session.context_data or {}
    graph_input = {
        "messages": langchain_messages,
        "session_id": str(session.id),
        "workspace_id": str(session.workspace_id),
        "repository_id": str(session.repository_id) if session.repository_id else None,
        "requirement_id": str(session.requirement_id) if session.requirement_id else None,
        "current_phase": session.current_phase or "idle",
        "starting_points": current_context.get("starting_points", []),
        "impact_summary": current_context.get("impact_summary", {}),
        "review_findings": current_context.get("review_findings", []),
        "test_gaps": current_context.get("test_gaps", []),
        "pr_draft": current_context.get("pr_draft", {}),
        "pending_approval": None,
        "approval_status": None,
        "user_feedback": None,
        "next_step": None,
    }

    # 3. Stream LangGraph execution
    new_agent_messages = []
    created_approval: AgentActionApproval | None = None

    try:
        await publish_agent_event(
            session_id=str(session.id),
            event_type="status",
            data={"message": "Analyzing prompt...", "phase": "thinking"},
        )

        async for event in agent_graph.astream(graph_input, config):
            for node_name, node_output in event.items():
                if node_name == "__interrupt__":
                    interrupt_val = node_output[0].value if node_output else {}
                    action_type = interrupt_val.get("action_type", "approval_required")
                    payload_data = interrupt_val.get("payload", {})

                    approval = AgentActionApproval(
                        session_id=session.id,
                        action_type=action_type,
                        payload=payload_data,
                        status="pending",
                    )
                    db.add(approval)
                    created_approval = approval
                    session.current_phase = f"awaiting_{action_type}"
                    await db.flush()

                    await publish_agent_event(
                        session_id=str(session.id),
                        event_type="approval_request",
                        data={
                            "approval_id": str(approval.id),
                            "action_type": action_type,
                            "payload": payload_data,
                        },
                    )

                elif isinstance(node_output, dict):
                    # Check if node updated phase or context
                    if "current_phase" in node_output:
                        session.current_phase = node_output["current_phase"]
                    for k in ("starting_points", "impact_summary", "review_findings", "test_gaps", "pr_draft"):
                        if k in node_output:
                            current_context[k] = node_output[k]
                    session.context_data = current_context

                    # Extract new AIMessages
                    node_msgs = node_output.get("messages", [])
                    for msg in node_msgs:
                        if isinstance(msg, AIMessage):
                            agent_msg = AgentMessage(
                                session_id=session.id,
                                sender="agent",
                                agent_role=node_name,
                                content=str(msg.content),
                                message_type="text",
                                artifacts={},
                            )
                            db.add(agent_msg)
                            new_agent_messages.append(agent_msg)
                            await publish_agent_event(
                                session_id=str(session.id),
                                event_type="token",
                                data={"content": str(msg.content), "role": node_name},
                            )

        session.updated_at = datetime.now(UTC)
        await db.commit()

        await publish_agent_event(
            session_id=str(session.id),
            event_type="done",
            data={"status": "completed"},
        )

    except Exception as e:
        logger.exception(f"Error during agent graph streaming for session {session_id}: {e}")
        await db.rollback()
        err_msg = AgentMessage(
            session_id=session.id,
            sender="agent",
            agent_role="system",
            content=f"An error occurred while processing your request: {e!s}",
            message_type="error",
        )
        db.add(err_msg)
        await db.commit()
        new_agent_messages.append(err_msg)

    return {
        "user_message": AgentMessageResponse.model_validate(user_msg),
        "agent_messages": [AgentMessageResponse.model_validate(m) for m in new_agent_messages],
        "pending_approval": AgentApprovalResponse.model_validate(created_approval) if created_approval else None,
        "current_phase": session.current_phase,
    }


@router.post("/sessions/{session_id}/approvals/{approval_id}", response_model=AgentApprovalResponse)
async def submit_agent_approval(
    session_id: uuid.UUID,
    approval_id: uuid.UUID,
    decision: AgentApprovalDecision,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentActionApproval:
    """
    Submit developer Human-in-the-Loop decision ('approve' or 'reject').
    Resumes the paused LangGraph state machine from its checkpoint and continues execution.
    """
    stmt_app = select(AgentActionApproval).where(
        AgentActionApproval.id == approval_id,
        AgentActionApproval.session_id == session_id,
    )
    result_app = await db.execute(stmt_app)
    approval = result_app.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")

    if approval.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval has already been resolved with status: {approval.status}",
        )

    # 1. Update approval record
    approval.status = decision.action
    approval.user_feedback = decision.user_feedback
    approval.decided_by = str(current_user.id)
    approval.decided_at = datetime.now(UTC)
    await db.flush()

    # Fetch session
    stmt_sess = select(AgentSession).where(AgentSession.id == session_id)
    res_sess = await db.execute(stmt_sess)
    session = res_sess.scalar_one()

    # 2. Resume LangGraph with decision command
    config = {"configurable": {"thread_id": str(session.id)}}
    resume_payload = {
        "status": decision.action,
        "user_feedback": decision.user_feedback,
    }

    try:
        await publish_agent_event(
            session_id=str(session.id),
            event_type="status",
            data={"message": f"Processing approval decision ({decision.action})...", "phase": "resuming"},
        )

        current_context = session.context_data or {}
        async for event in agent_graph.astream(Command(resume=resume_payload), config):
            for node_name, node_output in event.items():
                if node_name == "__interrupt__":
                    interrupt_val = node_output[0].value if node_output else {}
                    action_type = interrupt_val.get("action_type", "approval_required")
                    payload_data = interrupt_val.get("payload", {})

                    next_approval = AgentActionApproval(
                        session_id=session.id,
                        action_type=action_type,
                        payload=payload_data,
                        status="pending",
                    )
                    db.add(next_approval)
                    session.current_phase = f"awaiting_{action_type}"
                    await db.flush()

                    await publish_agent_event(
                        session_id=str(session.id),
                        event_type="approval_request",
                        data={
                            "approval_id": str(next_approval.id),
                            "action_type": action_type,
                            "payload": payload_data,
                        },
                    )

                elif isinstance(node_output, dict):
                    if "current_phase" in node_output:
                        session.current_phase = node_output["current_phase"]
                    for k in ("starting_points", "impact_summary", "review_findings", "test_gaps", "pr_draft"):
                        if k in node_output:
                            current_context[k] = node_output[k]
                    session.context_data = current_context

                    node_msgs = node_output.get("messages", [])
                    for msg in node_msgs:
                        if isinstance(msg, AIMessage):
                            agent_msg = AgentMessage(
                                session_id=session.id,
                                sender="agent",
                                agent_role=node_name,
                                content=str(msg.content),
                                message_type="text",
                                artifacts={},
                            )
                            db.add(agent_msg)
                            await publish_agent_event(
                                session_id=str(session.id),
                                event_type="token",
                                data={"content": str(msg.content), "role": node_name},
                            )

        session.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(approval)

        await publish_agent_event(
            session_id=str(session.id),
            event_type="done",
            data={"status": "completed"},
        )

    except Exception as e:
        logger.exception(f"Error resuming LangGraph after approval: {e}")
        await db.rollback()

    return approval


@router.get("/sessions/{session_id}/stream")
async def stream_agent_session_events(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Server-Sent Events (SSE) streaming endpoint for live tokens, tool traces, and HITL approvals."""
    async def event_generator():
        async for event in subscribe_agent_events(str(session_id)):
            event_type = event.get("type", "message")
            raw_data = json.dumps(event)
            yield f"event: {event_type}\ndata: {raw_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
