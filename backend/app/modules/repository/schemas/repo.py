from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, HttpUrl, field_serializer

from app.modules.repository.models.repo import SyncStatus


class RepoCreate(BaseModel):
    repo_url: HttpUrl


class RepoSettingsUpdate(BaseModel):
    auto_review_prs: bool | None = None
    auto_post_comments: bool | None = None
    default_requirement_id: UUID | None = None


class RepoResponse(BaseModel):
    id: UUID
    repo_url: str
    name: str
    sync_status: SyncStatus
    default_branch: str
    github_installation_id: int | None = None
    is_private: bool = False
    auto_review_prs: bool = False
    auto_post_comments: bool = False
    default_requirement_id: UUID | None = None
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)
