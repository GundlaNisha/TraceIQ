import enum
import uuid

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String
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

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("neon_auth.user.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    repo_url: Mapped[str] = mapped_column(String(512), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(100), default="main")
    sync_status: Mapped[SyncStatus] = mapped_column(SAEnum(SyncStatus), default=SyncStatus.pending)

class RepositorySnapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "repository_snapshots"

    repository_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repositories.id"), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    commit_sha: Mapped[str] = mapped_column(String(40), nullable=True)
