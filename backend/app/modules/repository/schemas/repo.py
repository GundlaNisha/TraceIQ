from pydantic import BaseModel, HttpUrl
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.modules.repository.models.repo import SyncStatus

class RepoCreate(BaseModel):
    repo_url: HttpUrl

class RepoResponse(BaseModel):
    id: UUID
    repo_url: str
    name: str
    sync_status: SyncStatus
    default_branch: str
    created_at: datetime

    class Config:
        from_attributes = True
