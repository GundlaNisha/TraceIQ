import enum
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base


class SyncStatus(str, enum.Enum):
    pending = "pending"
    syncing = "syncing"
    completed = "completed"
    failed = "failed"


class Repository(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "repositories"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    repo_url: Mapped[str] = mapped_column(String(512), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(100), default="main")
    sync_status: Mapped[SyncStatus] = mapped_column(
        SAEnum(SyncStatus), default=SyncStatus.pending
    )
    github_installation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("github_installations.installation_id", ondelete="SET NULL"),
        nullable=True,
    )
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_review_prs: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_post_comments: Mapped[bool] = mapped_column(Boolean, default=False)
    default_requirement_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("requirements.id", ondelete="SET NULL"),
        nullable=True,
    )


class RepositorySnapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "repository_snapshots"

    repository_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("repositories.id"), nullable=False
    )
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    commit_sha: Mapped[str] = mapped_column(String(40), nullable=True)
