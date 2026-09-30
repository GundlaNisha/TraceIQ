import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_serializer, field_validator


# ---------------------------------------------------------------------------
# Session Schemas
# ---------------------------------------------------------------------------

class AgentSessionCreate(BaseModel):
    workspace_id: uuid.UUID | None = None
    repository_id: uuid.UUID | None = None
    requirement_id: uuid.UUID | None = None
    title: str = "New Agent Session"

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        v = v.strip()
        return v[:255] if v else "New Agent Session"


class AgentSessionUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    repository_id: uuid.UUID | None = None
    requirement_id: uuid.UUID | None = None
    current_phase: str | None = None


class AgentSessionResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    user_id: str
    repository_id: uuid.UUID | None = None
    requirement_id: uuid.UUID | None = None
    title: str
    status: str
    current_phase: str
    context_metadata: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Message Schemas
# ---------------------------------------------------------------------------

class TaggedEntity(BaseModel):
    type: str  # "repo" | "req" | "pr"
    id: str
    label: str


class AgentMessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    artifacts: dict[str, Any] = {}
    tagged_entities: list[TaggedEntity] = []


class AgentMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    sender: str
    agent_role: str | None = None
    content: str
    message_type: str
    artifacts: dict[str, Any] = {}
    tool_calls: list[dict[str, Any]] = []
    created_at: datetime

    @field_serializer("created_at")
    def serialize_dt(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Approval Schemas (Human-in-the-Loop)
# ---------------------------------------------------------------------------

class AgentApprovalDecision(BaseModel):
    action: str  # approve | reject
    user_feedback: str | None = None
    edited_payload: dict[str, Any] | None = None


class AgentApprovalResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    message_id: uuid.UUID | None = None
    action_type: str
    payload: dict[str, Any]
    status: str
    user_feedback: str | None = None
    decided_by: str | None = None
    decided_at: datetime | None = None
    created_at: datetime

    @field_serializer("created_at", "decided_at")
    def serialize_dt(self, dt: datetime | None, _info) -> str | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Chat & Streaming Request Schemas
# ---------------------------------------------------------------------------

class AgentChatRequest(BaseModel):
    content: str
    repository_id: uuid.UUID | None = None
    requirement_id: uuid.UUID | None = None
    model_override: str | None = None


class AgentStreamChunk(BaseModel):
    event: str  # token | thought | tool_start | tool_end | approval_required | artifact | done | error
    data: dict[str, Any]
