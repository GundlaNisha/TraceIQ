from datetime import datetime
import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class Requirement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "requirements"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
    )
    jira_issue_key: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    jira_issue_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    jira_issue_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    jira_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    jira_priority: Mapped[str | None] = mapped_column(String(64), nullable=True)
    jira_issue_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    jira_synced_at: Mapped[datetime | None] = mapped_column(nullable=True)




class RequirementVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "requirement_versions"

    requirement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
