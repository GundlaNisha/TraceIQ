import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, field_serializer


class AnalysisJobResponse(BaseModel):
    id: uuid.UUID
    status: str
    progress: int
    requirement_id: uuid.UUID
    repository_id: uuid.UUID
    created_at: datetime
    requirement_title: str | None = None
    repository_name: str | None = None
    workspace_name: str | None = None
    workspace_id: uuid.UUID | None = None

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


class ImpactResultResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    impacted_files: dict
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)
