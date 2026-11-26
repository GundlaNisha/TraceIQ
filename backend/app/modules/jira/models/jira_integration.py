"""Jira Integration ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class JiraIntegration(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Stores Jira credentials (OAuth 2.0 3LO or API Token) and webhook config."""

    __tablename__ = "jira_integrations"

    __table_args__ = (
        Index("ix_jira_integrations_workspace_id", "workspace_id"),
        Index("ix_jira_integrations_user_id", "user_id"),
        Index("ix_jira_integrations_cloud_id", "cloud_id"),
    )

    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=True,
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Authentication mode: "api_token" (Basic Auth) or "oauth2" (Atlassian 3LO)
    auth_type: Mapped[str] = mapped_column(String(32), default="api_token", nullable=False)
    cloud_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    jira_domain: Mapped[str] = mapped_column(String(512), nullable=False)
    jira_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    # Encrypted API token (nullable when using OAuth 2.0)
    jira_api_token: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Encrypted Atlassian OAuth 2.0 (3LO) credentials
    oauth_access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    oauth_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    oauth_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    oauth_scopes: Mapped[str | None] = mapped_column(Text, nullable=True)

    default_project_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Encrypted webhook shared secret & Atlassian dynamic webhook tracking
    webhook_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    jira_webhook_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    webhook_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    webhook_status: Mapped[str] = mapped_column(String(32), default="manual", nullable=False)
