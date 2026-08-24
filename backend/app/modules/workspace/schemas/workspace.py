import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, field_serializer, field_validator


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class WorkspaceCreate(BaseModel):
    name: str
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Workspace name cannot be empty")
        return v


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class InviteCreate(BaseModel):
    email: str
    role: str = "member"  # viewer | member | admin

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        allowed = {"viewer", "member", "admin"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return v


class MemberRoleUpdate(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        allowed = {"viewer", "member", "admin"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    created_by: str
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


class WorkspaceMemberResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: str
    user_name: str | None = None
    user_email: str | None = None
    user_image: str | None = None
    role: str
    invited_by: str | None = None
    created_at: datetime

    @field_serializer("created_at")
    def serialize_dt(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


class WorkspaceInviteResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    email: str
    role: str
    token: str
    invited_by: str
    accepted_at: datetime | None
    expires_at: datetime
    created_at: datetime

    @field_serializer("accepted_at", "expires_at", "created_at")
    def serialize_dt(self, dt: datetime | None, _info) -> str | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


class WorkspaceSummaryResponse(BaseModel):
    workspace: WorkspaceResponse
    member_count: int
    repository_count: int
    requirement_count: int
    user_role: str | None = None


class WorkspaceRepoAssign(BaseModel):
    repository_id: uuid.UUID

