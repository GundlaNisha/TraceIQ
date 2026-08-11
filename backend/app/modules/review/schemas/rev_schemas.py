import uuid
import datetime

from pydantic import BaseModel, ConfigDict


class ReviewCreate(BaseModel):
    commit_hash: str
    repository_id: uuid.UUID
    requirement_id: uuid.UUID | None = None

class CommitEventResponse(BaseModel):
    id: uuid.UUID
    status: str
    requirement_id: uuid.UUID | None = None
    commit_hash: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class CommitDiffResponse(BaseModel):
    id: uuid.UUID
    file_path: str
    diff_text: str
    additions: int
    deletions: int

    model_config = ConfigDict(from_attributes=True)

class ReviewFindingResponse(BaseModel):
    id: uuid.UUID
    file_path: str
    line_number: int | None
    severity: str
    message: str

    model_config = ConfigDict(from_attributes=True)
