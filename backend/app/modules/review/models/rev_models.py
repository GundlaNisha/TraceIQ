import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class CommitEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "commit_events"
    repository_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repositories.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("neon_auth.user.id"))
    commit_hash: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(50), default="queued")
    requirement_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("requirements.id"), nullable=True) # Adding this so we know what requirement we're reviewing against!

class CommitDiff(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "commit_diffs"
    commit_event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("commit_events.id"))
    file_path: Mapped[str] = mapped_column(String(1024))
    diff_text: Mapped[str] = mapped_column(Text)
    additions: Mapped[int] = mapped_column(Integer, default=0)
    deletions: Mapped[int] = mapped_column(Integer, default=0)

class ReviewFinding(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "review_findings"
    commit_event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("commit_events.id"))
    file_path: Mapped[str] = mapped_column(String(1024))
    line_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    severity: Mapped[str] = mapped_column(String(20))  # high | medium | low
    message: Mapped[str] = mapped_column(Text)
