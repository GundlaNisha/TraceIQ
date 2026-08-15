import uuid

from pydantic import BaseModel, ConfigDict


class PRDraftCreate(BaseModel):
    requirement_id: uuid.UUID | None = None
    commit_event_id: uuid.UUID | None = None

class PRDraftUpdate(BaseModel):
    title: str | None = None
    description_markdown: str | None = None

from datetime import datetime


class PRDraftResponse(BaseModel):
    id: uuid.UUID
    title: str
    description_markdown: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
