from pydantic import BaseModel
import uuid
from typing import Optional

class PRDraftCreate(BaseModel):
    requirement_id: Optional[uuid.UUID] = None
    commit_event_id: Optional[uuid.UUID] = None

class PRDraftUpdate(BaseModel):
    description_markdown: str

class PRDraftResponse(BaseModel):
    id: uuid.UUID
    title: str
    description_markdown: str
    status: str

    class Config:
        from_attributes = True
