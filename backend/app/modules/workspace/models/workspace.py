"""Workspace ORM models.

Three tables:
  - workspaces         : the workspace entity itself
  - workspace_members  : user ↔ workspace membership with role
  - workspace_invitations : pending email invitations (token-based)
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class WorkspaceRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"


class Workspace(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A collaborative workspace that can own shared repositories and requirements."""

    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The user who created the workspace (always also an owner member)
    created_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )


class WorkspaceMember(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Maps a user to a workspace with a specific role."""

    __tablename__ = "workspace_members"

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_members"),
        Index("ix_workspace_members_user", "user_id"),
        Index("ix_workspace_members_workspace", "workspace_id"),
    )

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        SAEnum(WorkspaceRole), nullable=False, default=WorkspaceRole.member
    )
    invited_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class WorkspaceInvitation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A pending email invitation to join a workspace."""

    __tablename__ = "workspace_invitations"

    __table_args__ = (
        Index("ix_workspace_invitations_token", "token"),
        Index("ix_workspace_invitations_workspace", "workspace_id"),
    )

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    role: Mapped[WorkspaceRole] = mapped_column(
        SAEnum(WorkspaceRole), nullable=False, default=WorkspaceRole.member
    )
    # Cryptographically random token embedded in the invite link
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    invited_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    accepted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
