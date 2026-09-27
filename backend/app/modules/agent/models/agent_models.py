import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class AgentSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Represents a persistent multi-turn conversational session with the AI agent."""

    __tablename__ = "agent_sessions"

    __table_args__ = (
        Index("ix_agent_sessions_user_workspace", "workspace_id", "user_id"),
        Index("ix_agent_sessions_status", "status"),
    )

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repository_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New Agent Session")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    current_phase: Mapped[str] = mapped_column(
        String(50), nullable=False, default="exploring"
    )  # exploring | starting_point_confirmed | reviewing | drafting | completed
    context_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    @property
    def context_data(self) -> dict:
        return self.context_metadata

    @context_data.setter
    def context_data(self, val: dict) -> None:
        self.context_metadata = val


class AgentMessage(UUIDPrimaryKeyMixin, Base):
    """An individual message or tool turn within an agent session."""

    __tablename__ = "agent_messages"

    __table_args__ = (
        Index("ix_agent_messages_session_created", "session_id", "created_at"),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agent_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender: Mapped[str] = mapped_column(String(50), nullable=False)  # user | agent | tool | system
    agent_role: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # supervisor | code_explorer | impact_analyst | reviewer | test_analyst | pr_drafter
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    message_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="text"
    )  # text | starting_point_card | approval_prompt | review_report | pr_draft_card | status_update
    artifacts: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    tool_calls: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)


class AgentActionApproval(UUIDPrimaryKeyMixin, Base):
    """Tracks Human-in-the-Loop checkpoints and developer authorization decisions."""

    __tablename__ = "agent_action_approvals"

    __table_args__ = (
        Index("ix_agent_approvals_session_status", "session_id", "status"),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agent_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agent_messages.id", ondelete="CASCADE"), nullable=True, index=True
    )
    action_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # confirm_starting_point | confirm_review_standards | confirm_test_gaps | publish_pr_draft
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending", index=True
    )  # pending | approved | rejected | timed_out
    user_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
