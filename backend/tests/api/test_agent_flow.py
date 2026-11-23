import uuid
import pytest
from httpx import AsyncClient
from langchain_core.messages import HumanMessage

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
async def test_pr_number_extraction():
    """PR references (PR #7, #7) are parsed for background fetching."""
    from app.modules.agent.services.pr_fetch import extract_pr_numbers

    assert extract_pr_numbers("what are the findings in this PR #7?") == [7]
    assert extract_pr_numbers("audit #12 and #7") == [12, 7]
    assert extract_pr_numbers("no references here") == []


@pytest.mark.asyncio
async def test_intent_routing_verify_and_review():
    """Verify-implementation and review/blast-radius phrases route deterministically."""
    from app.modules.agent.graphs.nodes import _determine_user_intent

    assert (
        await _determine_user_intent(
            "audit this requirement, verify whether the feature is implemented", "idle"
        )
        == "verify"
    )
    assert (
        await _determine_user_intent("What is the estimated blast radius for this change?", "idle")
        == "explore"
    )
    assert await _determine_user_intent("What are the findings in this PR #7?", "idle") == "review"
    assert await _determine_user_intent("Draft a PR description for my changes", "idle") == "draft_pr"


def _base_state(**overrides):
    state = {
        "messages": [HumanMessage(content="Where should I start for requirement REQ-404?")],
        "session_id": "test-session-flow-1",
        "workspace_id": "00000000-0000-0000-0000-000000000000",
        "repository_id": None,
        "requirement_id": None,
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
        "diff_text": None,
    }
    state.update(overrides)
    return state


@pytest.mark.asyncio
async def test_agent_graph_state_machine_flow():
    """Verify the honest no-fabrication contract of the LangGraph workflow.

    - No bound repository -> needs_repository, END, no interrupt, clarification message.
    - Repository with an empty index -> needs_indexing, END, no interrupt.
    - Pre-review without a diff -> needs_diff, END, no interrupt.
    """
    from langgraph.checkpoint.memory import MemorySaver
    from app.modules.agent.graphs.workflow import build_agent_graph

    # Case 1: no repository -> clarification, END, no interrupt, no fabricated files
    graph = build_agent_graph(checkpointer=MemorySaver())
    config = {"configurable": {"thread_id": "test-session-flow-1"}}
    async for _ in graph.astream(_base_state(), config):
        pass
    state1 = await graph.aget_state(config)
    assert state1.next == ()
    assert not state1.tasks or not getattr(state1.tasks[0], "interrupts", None)
    assert state1.values.get("current_phase") == "needs_repository"
    assert state1.values.get("starting_points", []) == []
    assert "which repository" in str(state1.values["messages"][-1].content).lower()

    # Case 2: repository bound but index empty (fake UUID, no DB rows) -> needs_indexing
    graph2 = build_agent_graph(checkpointer=MemorySaver())
    config2 = {"configurable": {"thread_id": "test-session-flow-2"}}
    async for _ in graph2.astream(
        _base_state(repository_id="11111111-1111-1111-1111-111111111111"), config2
    ):
        pass
    state2 = await graph2.aget_state(config2)
    assert state2.next == ()
    assert state2.values.get("current_phase") == "needs_indexing"
    assert "isn't indexed yet" in str(state2.values["messages"][-1].content)

    # Case 3: pre-review with no diff -> needs_diff, END, no fabricated findings
    from app.modules.agent.graphs.nodes import pre_review_node

    out = await pre_review_node(
        _base_state(
            repository_id="11111111-1111-1111-1111-111111111111",
            current_phase="reviewing",
            diff_text=None,
        )
    )
    assert out["current_phase"] == "needs_diff"
    assert out["review_findings"] == []
    assert "need your diff" in str(out["messages"][0].content)


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
    """Verify user message processing asks for a repository instead of fabricating analysis."""
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

    # Post exploration message with NO repository bound anywhere
    msg_res = await test_client.post(
        f"/api/v1/agent/sessions/{session_id}/messages",
        json={"content": "Where should I start to implement webhook retry logic for Jira story PROJ-101?"},
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert "user_message" in msg_data
    assert len(msg_data["agent_messages"]) >= 1

    # No fabrication: clarification instead of a fake HITL interrupt
    assert msg_data.get("pending_approval") is None
    assert msg_data.get("current_phase") == "needs_repository"
    assert "which repository" in msg_data["agent_messages"][-1]["content"].lower()

    # Clean up session
    del_res = await test_client.delete(f"/api/v1/agent/sessions/{session_id}")
    assert del_res.status_code == 200

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_conversational_chat_and_tagged_entities(test_client: AsyncClient, db_session, test_user: User):
    """Verify conversational chat node responds to follow-up questions and handles @ tagged entities."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    ws = await _create_test_workspace(db_session, test_user)

    # 1. Create session
    create_res = await test_client.post(
        "/api/v1/agent/sessions",
        json={"workspace_id": str(ws.id), "title": "Conversational Agent Chat"},
    )
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    # 2. Send conversational question with tagged entities
    msg_res = await test_client.post(
        f"/api/v1/agent/sessions/{session_id}/messages",
        json={
            "content": "Can you explain how caching and rate limits work in @repo:TraceIQ/backend?",
            "tagged_entities": [
                {"type": "repo", "id": "TraceIQ/backend", "label": "TraceIQ/backend"}
            ],
        },
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert "user_message" in msg_data
    assert len(msg_data["agent_messages"]) >= 1
    # Conversational chat should not require HITL interrupt
    assert msg_data.get("pending_approval") is None
    ai_reply = msg_data["agent_messages"][-1]["content"]
    assert len(ai_reply) > 10

    # 3. Clean up
    await test_client.delete(f"/api/v1/agent/sessions/{session_id}")
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_requirement_model_properties_and_router_scoping():
    """Verify Requirement model provides jira_key and source aliases, and agent router module-level imports."""
    import uuid
    from app.modules.requirement.models.req import Requirement
    import app.modules.agent.routes.agent_router as ar

    # Verify Requirement model properties
    req = Requirement(
        id=uuid.uuid4(),
        user_id="user_1",
        repository_id=uuid.uuid4(),
        title="Test Requirement",
        text="Description",
        jira_issue_key="PROJ-999",
    )
    assert req.jira_key == "PROJ-999"
    assert req.source == "jira"

    req_manual = Requirement(
        id=uuid.uuid4(),
        user_id="user_1",
        repository_id=uuid.uuid4(),
        title="Manual Requirement",
        text="Description",
        jira_issue_key=None,
    )
    assert req_manual.jira_key is None
    assert req_manual.source == "manual"

    # Verify agent_router module-level functions exist and are not local-unbound
    assert callable(ar.extract_fenced_diff)
    assert callable(ar.extract_mention_tokens)
    assert callable(ar.resolve_repository_from_text)
    assert callable(ar.resolve_requirement_from_text)
    assert callable(ar.fetch_pr_diff_from_github)


@pytest.mark.asyncio
async def test_audit_missing_tests_filters_non_code_files_and_targets_languages():
    """Verify audit_missing_tests_fn excludes static/schema/config files and tailors test recommendations."""
    from app.modules.agent.tools.review_tools import audit_missing_tests_fn

    repo_id = str(uuid.uuid4())
    # Mix of non-code files and real frontend/backend files (identical to the user's PR #7)
    modified = [
        "google125d201a20233e56.html",
        "prisma/schema.prisma",
        "README.md",
        "package.json",
        "src/app/(main)/billing/page.tsx",
        "src/app/(main)/editor/Footer.tsx",
        "src/app/(main)/editor/HeaderAlignmentButton.tsx",
        "backend/app/services/billing.py",
    ]

    res = await audit_missing_tests_fn(
        repository_id=repo_id,
        modified_files=modified,
    )

    assert res["total_modified_files"] == len(modified)
    # google HTML, prisma schema, readme, package.json must be excluded from testable files
    assert res["testable_files_count"] == 4

    missing_paths = [m["file_path"] for m in res["missing_coverage"]]
    assert "google125d201a20233e56.html" not in missing_paths
    assert "prisma/schema.prisma" not in missing_paths
    assert "README.md" not in missing_paths
    assert "package.json" not in missing_paths

    assert "src/app/(main)/billing/page.tsx" in missing_paths
    assert "src/app/(main)/editor/Footer.tsx" in missing_paths
    assert "backend/app/services/billing.py" in missing_paths

    # Check that recommendations are language-aware
    rec_by_path = {m["file_path"]: m["recommendation"] for m in res["missing_coverage"]}
    assert "Footer.test.tsx" in rec_by_path["src/app/(main)/editor/Footer.tsx"]
    assert "test_billing.py" in rec_by_path["backend/app/services/billing.py"]
    assert ".test.py" not in rec_by_path["src/app/(main)/editor/Footer.tsx"]


@pytest.mark.asyncio
async def test_pre_review_node_existing_pr_review_vs_draft_flow():
    """Verify pre_review_node distinguishes between reviewing an existing PR vs drafting a new PR."""
    from app.modules.agent.graphs.nodes import pre_review_node
    from langchain_core.messages import HumanMessage

    repo_id = str(uuid.uuid4())
    sample_diff = (
        "--- a/src/app/(main)/editor/Footer.tsx\n"
        "+++ b/src/app/(main)/editor/Footer.tsx\n"
        "@@ -10,6 +10,7 @@\n"
        "+  console.log('debug');\n"
    )

    # 1. Existing PR review: user tags @PR or asks to review PR
    pr_state = _base_state(
        repository_id=repo_id,
        current_phase="reviewing",
        diff_text=sample_diff,
        tagged_entities=[{"type": "pr", "id": "pr-7", "label": "PR #7: Enhance forms"}],
        messages=[HumanMessage(content="coudl you reivew this PR @PR #7: Enhance forms and UI")],
    )
    pr_out = await pre_review_node(pr_state)

    assert pr_out["current_phase"] == "pr_reviewed"
    assert pr_out["next_step"] == "completed"
    assert pr_out["pending_approval"] is None
    assert "Pull Request" in str(pr_out["messages"][0].content)
    assert "Click 'Generate PR Draft'" not in str(pr_out["messages"][0].content)
    assert "tool_invocations" in pr_out

    # 2. Authoring / feature drafting flow (not an existing PR)
    draft_state = _base_state(
        repository_id=repo_id,
        current_phase="reviewing",
        diff_text=sample_diff,
        tagged_entities=[],
        messages=[HumanMessage(content="Audit changes before opening PR")],
    )
    draft_out = await pre_review_node(draft_state)

    assert draft_out["current_phase"] == "awaiting_pr_approval"
    assert draft_out["next_step"] == "hitl_pre_review"
    assert draft_out["pending_approval"] is not None
    assert draft_out["pending_approval"]["action_type"] == "confirm_review_standards"
    assert "Click **'Generate PR Draft'**" in str(draft_out["messages"][0].content)



