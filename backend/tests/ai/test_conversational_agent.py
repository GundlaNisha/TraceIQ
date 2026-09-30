import pytest
from langchain_core.messages import HumanMessage, AIMessage
from app.modules.agent.graphs.nodes import (
    supervisor_node,
    conversational_chat_node,
    _determine_user_intent,
)
from app.modules.agent.graphs.state import AgentState


@pytest.mark.asyncio
async def test_supervisor_routes_to_conversational_chat(monkeypatch):
    """Verify follow-up and conversational prompts route to conversational_chat."""
    class DummyRouter:
        async def chat_complete(self, messages, **kwargs):
            return "chat"

    import app.modules.agent.graphs.nodes as nodes_mod
    monkeypatch.setattr(nodes_mod, "ai_router", DummyRouter())

    state: AgentState = {
        "messages": [
            HumanMessage(content="Where should I start for this feature?"),
            AIMessage(content="You should start in auth/service.py"),
            HumanMessage(content="Why did you pick line 40 instead of line 12? Can you explain?"),
        ],
        "session_id": "sess-123",
        "workspace_id": "ws-123",
        "repository_id": "repo-123",
        "requirement_id": "req-123",
        "current_phase": "idle",
        "starting_points": [],
        "impact_summary": {},
        "review_findings": [],
        "test_gaps": [],
        "pr_draft": {},
        "pending_approval": None,
        "approval_status": None,
        "user_feedback": None,
        "next_step": None,
        "tagged_entities": [],
        "entity_context": None,
    }

    result = await supervisor_node(state)
    assert result["next_step"] == "conversational_chat"
    assert result["current_phase"] == "chatting"


@pytest.mark.asyncio
async def test_conversational_chat_node_generates_ai_response(monkeypatch):
    """Verify conversational_chat_node produces AI synthesized response and consumes context."""
    received_messages = []

    class DummyRouter:
        async def chat_complete(self, messages, **kwargs):
            received_messages.extend(messages)
            return "Line 40 defines the primary validation interceptor which executes before line 12."

    import app.modules.agent.graphs.nodes as nodes_mod
    monkeypatch.setattr(nodes_mod, "ai_router", DummyRouter())

    state: AgentState = {
        "messages": [
            HumanMessage(content="Why did you pick line 40?"),
        ],
        "session_id": "sess-123",
        "workspace_id": "ws-123",
        "repository_id": None,
        "requirement_id": None,
        "current_phase": "chatting",
        "starting_points": [],
        "impact_summary": {},
        "review_findings": [],
        "test_gaps": [],
        "pr_draft": {},
        "pending_approval": None,
        "approval_status": None,
        "user_feedback": None,
        "next_step": None,
        "tagged_entities": [{"type": "repo", "id": "my-repo", "label": "my-repo"}],
        "entity_context": "📁 [Tagged Repository: my-repo]\nBranch: main",
    }

    result = await conversational_chat_node(state)
    assert result["current_phase"] == "chatting"
    assert result["next_step"] == "completed"
    assert len(result["messages"]) == 1
    assert "Line 40 defines the primary validation interceptor" in result["messages"][0].content

    # Verify tagged entity context was injected into system prompt
    assert any("📁 [Tagged Repository: my-repo]" in msg["content"] for msg in received_messages if msg["role"] == "system")
