import secrets
import uuid
from datetime import UTC, datetime, timedelta
from re import sub

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.modules.auth.models.user import User
from app.modules.workspace.models.workspace import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceMember,
    WorkspaceRole,
)
from app.modules.workspace.schemas.workspace import (
    InviteCreate,
    MemberRoleUpdate,
    WorkspaceCreate,
    WorkspaceInviteResponse,
    WorkspaceMemberResponse,
    WorkspaceResponse,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])

INVITE_EXPIRE_DAYS = 7


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _slugify(name: str) -> str:
    slug = name.strip().lower()
    slug = sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug[:80]


async def _get_member(
    workspace_id: uuid.UUID,
    user_id: str,
    db: AsyncSession,
) -> WorkspaceMember | None:
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


def _require_role(member: WorkspaceMember | None, minimum: WorkspaceRole) -> None:
    """Raise ForbiddenError if member does not have at least the required role."""
    hierarchy = [WorkspaceRole.viewer, WorkspaceRole.member, WorkspaceRole.admin, WorkspaceRole.owner]
    if member is None or hierarchy.index(member.role) < hierarchy.index(minimum):
        raise ForbiddenError("Insufficient workspace permissions")


# ---------------------------------------------------------------------------
# Workspace CRUD
# ---------------------------------------------------------------------------


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    body: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace. The creator becomes the owner."""
    base_slug = _slugify(body.name)

    # Ensure unique slug
    slug = base_slug
    suffix = 1
    while True:
        existing = await db.execute(select(Workspace).where(Workspace.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    workspace = Workspace(
        name=body.name.strip(),
        slug=slug,
        description=body.description,
        created_by=current_user.id,
    )
    db.add(workspace)
    await db.flush()  # get workspace.id

    # Add creator as owner member
    owner_member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role=WorkspaceRole.owner,
    )
    db.add(owner_member)
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all workspaces the current user is a member of."""
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == current_user.id)
        .order_by(Workspace.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a workspace by ID (must be a member)."""
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise NotFoundError("Workspace not found")
    member = await _get_member(workspace_id, current_user.id, db)
    if not member:
        raise ForbiddenError("Not a member of this workspace")
    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: uuid.UUID,
    body: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update workspace name / description. Requires admin or owner role."""
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise NotFoundError("Workspace not found")
    member = await _get_member(workspace_id, current_user.id, db)
    _require_role(member, WorkspaceRole.admin)

    if body.name is not None:
        workspace.name = body.name.strip()
    if body.description is not None:
        workspace.description = body.description

    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workspace. Owner only."""
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise NotFoundError("Workspace not found")
    member = await _get_member(workspace_id, current_user.id, db)
    _require_role(member, WorkspaceRole.owner)

    await db.delete(workspace)
    await db.commit()


# ---------------------------------------------------------------------------
# Member management
# ---------------------------------------------------------------------------


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
async def list_members(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all members of a workspace."""
    member = await _get_member(workspace_id, current_user.id, db)
    if not member:
        raise ForbiddenError("Not a member of this workspace")

    result = await db.execute(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.created_at)
    )
    return result.scalars().all()


@router.patch("/{workspace_id}/members/{target_user_id}", response_model=WorkspaceMemberResponse)
async def update_member_role(
    workspace_id: uuid.UUID,
    target_user_id: str,
    body: MemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change a member's role. Requires admin+. Cannot demote the owner."""
    actor = await _get_member(workspace_id, current_user.id, db)
    _require_role(actor, WorkspaceRole.admin)

    target = await _get_member(workspace_id, target_user_id, db)
    if not target:
        raise NotFoundError("Member not found")
    if target.role == WorkspaceRole.owner:
        raise HTTPException(status_code=400, detail="Cannot change the workspace owner's role")

    target.role = WorkspaceRole(body.role)
    await db.commit()
    await db.refresh(target)
    return target


@router.delete("/{workspace_id}/members/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: uuid.UUID,
    target_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member. Admins can remove others; members can remove themselves."""
    actor = await _get_member(workspace_id, current_user.id, db)
    if not actor:
        raise ForbiddenError("Not a member of this workspace")

    target = await _get_member(workspace_id, target_user_id, db)
    if not target:
        raise NotFoundError("Member not found")

    # Self-removal is always allowed; removing others requires admin+
    if target_user_id != current_user.id:
        _require_role(actor, WorkspaceRole.admin)

    if target.role == WorkspaceRole.owner:
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")

    await db.delete(target)
    await db.commit()


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------


@router.post("/{workspace_id}/invite", response_model=WorkspaceInviteResponse)
async def invite_member(
    workspace_id: uuid.UUID,
    body: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite someone by email. Returns the invite record including the token (for link sharing)."""
    actor = await _get_member(workspace_id, current_user.id, db)
    _require_role(actor, WorkspaceRole.admin)

    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise NotFoundError("Workspace not found")

    # Check if the email is already a member
    user_result = await db.execute(select(User).where(User.email == body.email))
    existing_user = user_result.scalar_one_or_none()
    if existing_user:
        existing_member = await _get_member(workspace_id, existing_user.id, db)
        if existing_member:
            raise HTTPException(status_code=409, detail="User is already a member of this workspace")

    token = secrets.token_urlsafe(32)
    invitation = WorkspaceInvitation(
        workspace_id=workspace_id,
        email=body.email,
        role=WorkspaceRole(body.role),
        token=token,
        invited_by=current_user.id,
        expires_at=datetime.now(UTC) + timedelta(days=INVITE_EXPIRE_DAYS),
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    return invitation


@router.get("/join/{token}", response_model=WorkspaceResponse)
async def accept_invite(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept a workspace invitation via token. Adds the current user as a member."""
    result = await db.execute(
        select(WorkspaceInvitation).where(WorkspaceInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise NotFoundError("Invitation not found or already used")
    if invitation.accepted_at is not None:
        raise HTTPException(status_code=410, detail="Invitation has already been accepted")
    if invitation.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(status_code=410, detail="Invitation has expired")

    # Check if already a member
    existing = await _get_member(invitation.workspace_id, current_user.id, db)
    if existing:
        raise HTTPException(status_code=409, detail="You are already a member of this workspace")

    member = WorkspaceMember(
        workspace_id=invitation.workspace_id,
        user_id=current_user.id,
        role=invitation.role,
        invited_by=invitation.invited_by,
    )
    db.add(member)

    invitation.accepted_at = datetime.now(UTC)
    await db.commit()

    workspace = await db.get(Workspace, invitation.workspace_id)
    return workspace


@router.get("/{workspace_id}/invites", response_model=list[WorkspaceInviteResponse])
async def list_invites(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all pending invitations for a workspace (admin+)."""
    actor = await _get_member(workspace_id, current_user.id, db)
    _require_role(actor, WorkspaceRole.admin)

    result = await db.execute(
        select(WorkspaceInvitation)
        .where(
            WorkspaceInvitation.workspace_id == workspace_id,
            WorkspaceInvitation.accepted_at.is_(None),
        )
        .order_by(WorkspaceInvitation.created_at.desc())
    )
    return result.scalars().all()
