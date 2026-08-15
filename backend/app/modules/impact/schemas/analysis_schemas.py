import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnalysisJobResponse(BaseModel):
    id: uuid.UUID
    status: str
    progress: int
    requirement_id: uuid.UUID
    repository_id: uuid.UUID
    created_at: datetime
    requirement_title: str | None = None
    repository_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ImpactResultResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    impacted_files: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
