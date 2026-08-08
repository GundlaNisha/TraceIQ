import uuid

from pydantic import BaseModel, ConfigDict


class PRDraftCreate(BaseModel):
    requirement_id: uuid.UUID | None = None
    commit_event_id: uuid.UUID | None = None

class PRDraftUpdate(BaseModel):
    description_markdown: str

class PRDraftResponse(BaseModel):
    id: uuid.UUID
    title: str
    description_markdown: str
    status: str

    model_config = ConfigDict(from_attributes=True)
