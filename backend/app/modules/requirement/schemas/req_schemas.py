import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class ReqBase(BaseModel):
    title: str = Field(..., max_length=512)
    text: str = Field(..., min_length=1)


class ReqCreate(ReqBase):
    repository_id: str
    workspace_id: uuid.UUID | None = None


class ReqUpdate(ReqBase):
    pass


class VersionResponse(ReqBase):
    id: uuid.UUID
    requirement_id: uuid.UUID
    version_number: int
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_dates(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


class ReqResponse(ReqBase):
    id: uuid.UUID
    user_id: str
    repository_id: uuid.UUID
    version_number: int
    workspace_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


    @field_serializer("created_at", "updated_at")
    def serialize_dates(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)
