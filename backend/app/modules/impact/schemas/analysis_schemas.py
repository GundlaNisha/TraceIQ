from pydantic import BaseModel
import uuid
from datetime import datetime

class AnalysisJobResponse(BaseModel):
    id: uuid.UUID
    status: str
    progress: int
    requirement_id: uuid.UUID
    repository_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class ImpactResultResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    impacted_files: dict
    created_at: datetime

    class Config:
        from_attributes = True
