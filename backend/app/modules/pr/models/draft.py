import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class PRDraft(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "pr_drafts"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    requirement_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requirements.id"), nullable=True)
    commit_event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("commit_events.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(512))
    description_markdown: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="generated")  # generated | edited
