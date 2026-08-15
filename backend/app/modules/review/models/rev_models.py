import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class CommitEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "commit_events"
    repository_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repositories.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
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


class PRReview(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks an AI review of an entire GitHub Pull Request."""
    __tablename__ = "pr_reviews"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    repository_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repositories.id"), nullable=False)
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("requirements.id", ondelete="SET NULL"), nullable=True)
    pr_number: Mapped[int] = mapped_column(Integer, nullable=False)
    pr_title: Mapped[str] = mapped_column(String(512), nullable=False)
    pr_html_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="queued")  # queued | running | completed | failed
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)


class PRReviewFinding(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A single AI finding within a PR review."""
    __tablename__ = "pr_review_findings"

    pr_review_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pr_reviews.id"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(1024))
    line_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    severity: Mapped[str] = mapped_column(String(20))  # high | medium | low
    message: Mapped[str] = mapped_column(Text)
    requirement_gap: Mapped[str | None] = mapped_column(Text, nullable=True)  # how it violates the requirement
