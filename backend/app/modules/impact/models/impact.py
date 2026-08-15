import enum
import uuid

from sqlalchemy import JSON, ForeignKey, Integer
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base.models import Base

# Import related models for SQLAlchemy metadata


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class AnalysisJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "analysis_jobs"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("requirements.id"), nullable=False
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("repositories.id"), nullable=False
    )
    status: Mapped[JobStatus] = mapped_column(
        SAEnum(JobStatus), default=JobStatus.queued
    )
    progress: Mapped[int] = mapped_column(Integer, default=0)


class ImpactResult(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "impact_results"
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("analysis_jobs.id"), unique=True
    )
    impacted_files: Mapped[dict] = mapped_column(JSON, nullable=False)
