import uuid
import pytest
from httpx import AsyncClient

from app.core.deps import get_current_user
from app.main import app
from app.modules.agent.models.agent_models import AgentSession
from app.modules.agent.tools.impact_tools import get_blast_radius_fn
from app.modules.agent.tools.review_tools import (
    audit_diff_standards_fn,
    audit_missing_tests_fn,
)
from app.modules.auth.models.user import User
from app.modules.workspace.models.workspace import Workspace, WorkspaceMember, WorkspaceRole


@pytest.fixture
def test_user():
    return User(
        id="user_test_a",
        email="a@example.com",
        name="Agent Tester",
    )


async def _create_test_workspace(db_session, user: User) -> Workspace:
    ws = Workspace(
        name="AI Agent Testing Lab",
        slug=f"agent-lab-{uuid.uuid4().hex[:6]}",
        description="Workspace for verifying AI agent features",
        created_by=user.id,
    )
    db_session.add(ws)
    await db_session.flush()

    member = WorkspaceMember(
        workspace_id=ws.id,
        user_id=user.id,
        role=WorkspaceRole.owner,
    )
    db_session.add(member)
    await db_session.commit()
    return ws


@pytest.mark.asyncio
async def test_agent_tools_direct():
    """Verify standards audit flags security and quality violations."""
    vulnerable_diff = """
--- a/auth.py
+++ b/auth.py
@@ -1,5 +1,10 @@
+api_key = "sk_live_12345678abcdefgh"
+query = "SELECT * FROM users WHERE id = " + user_id
+except:
+print("debug log")
+TODO: clean up later
"""
    results = audit_diff_standards_fn(vulnerable_diff)
    assert results["total_findings"] >= 3
    assert results["passed"] is False

    rules_triggered = [f["rule"] for f in results["findings"]]
    assert "no-hardcoded-secrets" in rules_triggered
    assert "sql-injection-risk" in rules_triggered
    assert "no-bare-except" in rules_triggered


@pytest.mark.asyncio
async def test_agent_graph_state_machine_flow():
    """Verify complete multi-agent LangGraph workflow execution with HITL interrupts and approvals."""
    from langchain_core.messages import HumanMessage
    from langgraph.checkpoint.memory import MemorySaver
    from langgraph.types import Command
    from app.modules.agent.graphs.workflow import build_agent_graph

    saver = MemorySaver()
    graph = build_agent_graph(checkpointer=saver)
    config = {"configurable": {"thread_id": "test-session-flow-1"}}

    init_state = {
        "messages": [HumanMessage(content="Where should I start for requirement REQ-404?")],
        "session_id": "test-session-flow-1",
        "workspace_id": "00000000-0000-0000-0000-000000000000",
        "repository_id": None,
        "requirement_id": "REQ-404",
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
    }

    # Step 1: User message triggers supervisor -> code_explorer -> hitl_starting_point interrupt
    async for _ in graph.astream(init_state, config):
        pass

    state1 = await graph.aget_state(config)
    assert "hitl_starting_point" in state1.next
    assert state1.values.get("current_phase") == "awaiting_starting_point_approval"
    assert len(state1.values.get("starting_points", [])) >= 1

    # Step 2: Resume Checkpoint 1 (Developer confirms starting point)
    async for _ in graph.astream(Command(resume={"status": "approved"}), config):
        pass

    state2 = await graph.aget_state(config)
    assert "hitl_pre_review" in state2.next
    assert state2.values.get("current_phase") == "awaiting_pr_approval"
    assert len(state2.values.get("review_findings", [])) >= 1

    # Step 3: Resume Checkpoint 2 (Developer acknowledges pre-review audit)
    async for _ in graph.astream(Command(resume={"status": "approved"}), config):
        pass

    state3 = await graph.aget_state(config)
    assert state3.next == ()  # Reached END node
    assert state3.values.get("current_phase") == "pr_drafted"
    pr_draft = state3.values.get("pr_draft", {})
    assert pr_draft.get("title") is not None
    assert "feat(" in pr_draft.get("title", "")
    assert pr_draft.get("raw_markdown") is not None
    assert "## 📌 Linked Requirement" in pr_draft.get("raw_markdown", "")


@pytest.mark.asyncio
async def test_create_and_list_agent_sessions(test_client: AsyncClient, db_session, test_user: User):
    """Verify creating, listing, and retrieving agent sessions."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    ws = await _create_test_workspace(db_session, test_user)

    # 1. Create Session
    create_res = await test_client.post(
        "/api/v1/agent/sessions",
        json={
            "workspace_id": str(ws.id),
            "title": "PROJ-102 Feature Exploration",
        },
    )
    assert create_res.status_code == 201
    sess_data = create_res.json()
    assert sess_data["title"] == "PROJ-102 Feature Exploration"
    session_id = sess_data["id"]

    # 2. List Sessions
    list_res = await test_client.get(f"/api/v1/agent/sessions?workspace_id={ws.id}")
    assert list_res.status_code == 200
    sessions_list = list_res.json()
    assert len(sessions_list) >= 1
    assert any(s["id"] == session_id for s in sessions_list)

    # 3. Get Session Detail
    detail_res = await test_client.get(f"/api/v1/agent/sessions/{session_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["session"]["id"] == session_id
    assert len(detail["messages"]) >= 1  # Initial greeting

    # 4. Personal session without workspace_id
    personal_create_res = await test_client.post(
        "/api/v1/agent/sessions",
        json={"title": "Personal Exploration Chat"},
    )
    assert personal_create_res.status_code == 201
    personal_sess = personal_create_res.json()
    assert personal_sess["title"] == "Personal Exploration Chat"

    # List sessions without workspace_id query parameter
    all_list_res = await test_client.get("/api/v1/agent/sessions")
    assert all_list_res.status_code == 200
    all_sessions = all_list_res.json()
    assert any(s["id"] == personal_sess["id"] for s in all_sessions)

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_agent_message_and_hitl_approval_flow(test_client: AsyncClient, db_session, test_user: User):
    """Verify user message processing, HITL interrupt generation, and approval resumption."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    ws = await _create_test_workspace(db_session, test_user)

    # Create session
    create_res = await test_client.post(
        "/api/v1/agent/sessions",
        json={
            "workspace_id": str(ws.id),
            "title": "Webhook Retry Analysis",
        },
    )
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    # Post message that triggers starting point exploration
    msg_res = await test_client.post(
        f"/api/v1/agent/sessions/{session_id}/messages",
        json={"content": "Where should I start to implement webhook retry logic for Jira story PROJ-101?"},
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert "user_message" in msg_data
    assert len(msg_data["agent_messages"]) >= 1

    # Verify a pending approval checkpoint was generated by HITL interrupt
    pending_app = msg_data.get("pending_approval")
    assert pending_app is not None
    assert pending_app["action_type"] == "confirm_starting_point"
    assert pending_app["status"] == "pending"

    # Confirm / Approve the starting point
    approval_id = pending_app["id"]
    approval_res = await test_client.post(
        f"/api/v1/agent/sessions/{session_id}/approvals/{approval_id}",
        json={"action": "approve", "user_feedback": "Looks great, please proceed to pre-review!"},
    )
    assert approval_res.status_code == 200
    app_data = approval_res.json()
    assert app_data["status"] == "approved"

    # Clean up session
    del_res = await test_client.delete(f"/api/v1/agent/sessions/{session_id}")
    assert del_res.status_code == 200

    app.dependency_overrides.clear()
