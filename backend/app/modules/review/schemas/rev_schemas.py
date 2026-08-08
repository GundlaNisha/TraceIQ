from pydantic import BaseModel
import uuid
from typing import List, Optional

class ReviewCreate(BaseModel):
    commit_hash: str
    repository_id: uuid.UUID
    requirement_id: Optional[uuid.UUID] = None

class CommitEventResponse(BaseModel):
    id: uuid.UUID
    status: str

    class Config:
        from_attributes = True

class CommitDiffResponse(BaseModel):
    id: uuid.UUID
    file_path: str
    diff_text: str
    additions: int
    deletions: int

    class Config:
        from_attributes = True

class ReviewFindingResponse(BaseModel):
    id: uuid.UUID
    file_path: str
    line_number: Optional[int]
    severity: str
    message: str

    class Config:
        from_attributes = True
