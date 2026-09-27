from __future__ import annotations

from typing import Annotated, Any, Optional
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    Central state container for the LangGraph multi-agent orchestration workflow.
    Maintains conversation trajectory, active metadata, codebase context,
    audit findings, and Human-in-the-Loop (HITL) checkpoints.
    """
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    workspace_id: str
    repository_id: Optional[str]
    requirement_id: Optional[str]
    current_phase: str
    starting_points: list[dict[str, Any]]
    impact_summary: dict[str, Any]
    review_findings: list[dict[str, Any]]
    test_gaps: list[dict[str, Any]]
    pr_draft: dict[str, Any]
    pending_approval: Optional[dict[str, Any]]
    approval_status: Optional[str]
    user_feedback: Optional[str]
    next_step: Optional[str]
