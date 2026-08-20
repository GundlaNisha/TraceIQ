from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, HttpUrl, field_serializer

from app.modules.repository.models.repo import SyncStatus


class RepoCreate(BaseModel):
    repo_url: HttpUrl


class RepoResponse(BaseModel):
    id: UUID
    repo_url: str
    name: str
    sync_status: SyncStatus
    default_branch: str
    github_installation_id: int | None = None
    is_private: bool = False
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)
