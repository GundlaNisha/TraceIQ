from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, HttpUrl

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

    model_config = ConfigDict(from_attributes=True)
