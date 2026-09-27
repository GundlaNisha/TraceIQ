import uuid
from datetime import UTC, datetime, timedelta
import pytest
from httpx import AsyncClient

from app.core.deps import get_current_user, get_current_user_optional
from app.main import app
from app.modules.auth.models.user import User
from app.modules.workspace.models.workspace import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceMember,
    WorkspaceRole,
)


@pytest.fixture
def owner_user():
    return User(
        id="user_test_a",
        email="a@example.com",
        name="Workspace Owner",
    )


@pytest.fixture
def invitee_user():
    return User(
        id="user_test_b",
        email="b@example.com",
        name="Invited Teammate",
    )


@pytest.fixture
def other_user():
    return User(
        id="user_test_c",
        email="test@example.com",
        name="Random User",
    )


async def _setup_workspace_and_invite(db_session, owner: User, invitee_email: str):
    ws = Workspace(
        name="Acme Eng Team",
        slug=f"acme-eng-{uuid.uuid4().hex[:6]}",
        description="Engineering workspace",
        created_by=owner.id,
    )
    db_session.add(ws)
    await db_session.flush()

    member = WorkspaceMember(
        workspace_id=ws.id,
        user_id=owner.id,
        role=WorkspaceRole.owner,
    )
    db_session.add(member)

    invite_token = f"tok_{uuid.uuid4().hex}"
    invite = WorkspaceInvitation(
        workspace_id=ws.id,
        email=invitee_email,
        role=WorkspaceRole.member,
        token=invite_token,
        invited_by=owner.id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db_session.add(invite)
    await db_session.flush()

    return ws, invite


async def test_preview_invite_unauthenticated(test_client: AsyncClient, db_session, owner_user: User):
    ws, invite = await _setup_workspace_and_invite(db_session, owner_user, "b@example.com")

    # Preview should succeed without auth
    app.dependency_overrides[get_current_user_optional] = lambda: None
    try:
        res = await test_client.get(f"/api/v1/workspaces/join/{invite.token}")
        assert res.status_code == 200
        data = res.json()
        assert data["workspace_name"] == "Acme Eng Team"
        assert data["email"] == "b@example.com"
        assert data["role"] == "member"
        assert data["invited_by_name"] == "Mock A" or data["invited_by_name"] == "Workspace Owner"
        assert data["is_expired"] is False
        assert data["already_accepted"] is False
        assert data["is_current_user_member"] is False
    finally:
        app.dependency_overrides.pop(get_current_user_optional, None)


async def test_preview_invite_authenticated_already_member(
    test_client: AsyncClient, db_session, owner_user: User
):
    ws, invite = await _setup_workspace_and_invite(db_session, owner_user, "b@example.com")

    # Owner is already a member
    app.dependency_overrides[get_current_user_optional] = lambda: owner_user
    try:
        res = await test_client.get(f"/api/v1/workspaces/invites/{invite.token}/preview")
        assert res.status_code == 200
        data = res.json()
        assert data["is_current_user_member"] is True
        assert data["current_user_role"] == "owner"
    finally:
        app.dependency_overrides.pop(get_current_user_optional, None)


async def test_accept_invite_flow(
    test_client: AsyncClient, db_session, owner_user: User, invitee_user: User
):
    ws, invite = await _setup_workspace_and_invite(db_session, owner_user, invitee_user.email)

    app.dependency_overrides[get_current_user] = lambda: invitee_user
    try:
        # POST /join/{token}/accept
        res = await test_client.post(f"/api/v1/workspaces/join/{invite.token}/accept")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == str(ws.id)

        # Trying to accept again should return 410 or 409
        res2 = await test_client.post(f"/api/v1/workspaces/join/{invite.token}/accept")
        assert res2.status_code in (409, 410)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


async def test_decline_invite_flow(
    test_client: AsyncClient, db_session, owner_user: User, invitee_user: User
):
    ws, invite = await _setup_workspace_and_invite(db_session, owner_user, invitee_user.email)

    app.dependency_overrides[get_current_user] = lambda: invitee_user
    app.dependency_overrides[get_current_user_optional] = lambda: invitee_user
    try:
        res = await test_client.post(f"/api/v1/workspaces/join/{invite.token}/decline")
        assert res.status_code == 200
        assert res.json()["status"] == "success"

        # Subsequent preview should be 404
        prev_res = await test_client.get(f"/api/v1/workspaces/join/{invite.token}")
        assert prev_res.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_current_user_optional, None)


async def test_revoke_invite_flow(
    test_client: AsyncClient, db_session, owner_user: User, invitee_user: User
):
    ws, invite = await _setup_workspace_and_invite(db_session, owner_user, invitee_user.email)

    # Invitee (not member/admin) should get 403
    app.dependency_overrides[get_current_user] = lambda: invitee_user
    try:
        res_fail = await test_client.delete(f"/api/v1/workspaces/{ws.id}/invites/{invite.id}")
        assert res_fail.status_code == 403

        # Owner (admin+) should succeed with 204
        app.dependency_overrides[get_current_user] = lambda: owner_user
        res_ok = await test_client.delete(f"/api/v1/workspaces/{ws.id}/invites/{invite.id}")
        assert res_ok.status_code == 204
    finally:
        app.dependency_overrides.pop(get_current_user, None)
