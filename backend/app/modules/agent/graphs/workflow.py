from __future__ import annotations

import logging
from typing import Any, Optional
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.modules.agent.graphs.nodes import (
    code_explorer_node,
    conversational_chat_node,
    hitl_pre_review_node,
    hitl_starting_point_node,
    pre_review_node,
    pr_drafter_node,
    supervisor_node,
)
from app.modules.agent.graphs.state import AgentState

logger = logging.getLogger(__name__)

# Default in-memory checkpoint saver for active sessions
_default_checkpointer: BaseCheckpointSaver = MemorySaver()


def _route_supervisor(state: AgentState) -> str:
    """Routes execution from supervisor to appropriate domain agent node or terminates."""
    next_step = state.get("next_step")
    if next_step in ("code_explorer", "pre_review", "pr_drafter", "conversational_chat"):
        return next_step
    return "end"


def _route_starting_point_hitl(state: AgentState) -> str:
    """Routes after developer confirms or rejects starting points."""
    if state.get("approval_status") == "approved":
        return "pre_review"
    return "end"


def _route_pre_review_hitl(state: AgentState) -> str:
    """Routes after developer acknowledges pre-review audit findings."""
    if state.get("approval_status") == "approved":
        return "pr_drafter"
    return "end"


def build_agent_graph(checkpointer: Optional[BaseCheckpointSaver] = None):
    """
    Constructs and compiles the TraceIQ Multi-Agent LangGraph workflow.
    Enforces Human-in-the-Loop checkpointer gates before standards audits and PR generation.
    """
    builder = StateGraph(AgentState)

    # Register domain agent nodes
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("conversational_chat", conversational_chat_node)
    builder.add_node("code_explorer", code_explorer_node)
    builder.add_node("hitl_starting_point", hitl_starting_point_node)
    builder.add_node("pre_review", pre_review_node)
    builder.add_node("hitl_pre_review", hitl_pre_review_node)
    builder.add_node("pr_drafter", pr_drafter_node)

    # Entry edge
    builder.add_edge(START, "supervisor")

    # Conditional routing from supervisor
    builder.add_conditional_edges(
        "supervisor",
        _route_supervisor,
        {
            "code_explorer": "code_explorer",
            "pre_review": "pre_review",
            "pr_drafter": "pr_drafter",
            "conversational_chat": "conversational_chat",
            "end": END,
        },
    )

    # Conversational Chat -> End
    builder.add_edge("conversational_chat", END)

    # Code exploration -> HITL Checkpoint 1
    builder.add_edge("code_explorer", "hitl_starting_point")

    # HITL Checkpoint 1 -> Pre-Review or End
    builder.add_conditional_edges(
        "hitl_starting_point",
        _route_starting_point_hitl,
        {
            "pre_review": "pre_review",
            "end": END,
        },
    )

    # Pre-Review -> HITL Checkpoint 2
    builder.add_edge("pre_review", "hitl_pre_review")

    # HITL Checkpoint 2 -> PR Drafter or End
    builder.add_conditional_edges(
        "hitl_pre_review",
        _route_pre_review_hitl,
        {
            "pr_drafter": "pr_drafter",
            "end": END,
        },
    )

    # PR Drafter -> End
    builder.add_edge("pr_drafter", END)

    saver = checkpointer if checkpointer is not None else _default_checkpointer
    return builder.compile(checkpointer=saver)


# Singleton compiled graph instance
agent_graph = build_agent_graph()
