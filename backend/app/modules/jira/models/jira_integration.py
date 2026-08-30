"""Jira Integration ORM model."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class JiraIntegration(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Stores Jira credentials and configuration per workspace or user."""

    __tablename__ = "jira_integrations"

    __table_args__ = (
        Index("ix_jira_integrations_workspace_id", "workspace_id"),
        Index("ix_jira_integrations_user_id", "user_id"),
    )

    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    jira_domain: Mapped[str] = mapped_column(String(512), nullable=False)
    jira_email: Mapped[str] = mapped_column(String(255), nullable=False)
    jira_api_token: Mapped[str] = mapped_column(Text, nullable=False)
    default_project_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
