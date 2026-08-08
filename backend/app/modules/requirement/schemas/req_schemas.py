import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReqBase(BaseModel):
    title: str = Field(..., max_length=512)
    text: str = Field(..., min_length=1)

class ReqCreate(ReqBase):
    repository_id: str

class ReqUpdate(ReqBase):
    pass

class VersionResponse(ReqBase):
    id: uuid.UUID
    requirement_id: uuid.UUID
    version_number: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReqResponse(ReqBase):
    id: uuid.UUID
    user_id: uuid.UUID
    repository_id: uuid.UUID
    version_number: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
