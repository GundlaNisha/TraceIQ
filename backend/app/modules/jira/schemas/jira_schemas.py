"""Pydantic schemas for Jira Integration API."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class JiraConfigBase(BaseModel):
    jira_domain: str = Field(..., description="Jira instance domain, e.g. https://company.atlassian.net")
    jira_email: str = Field(..., description="Jira user email address")
    default_project_key: str | None = Field(None, max_length=64, description="Optional default project key")


class JiraConfigCreate(JiraConfigBase):
    jira_api_token: str = Field(..., min_length=1, description="Atlassian API token")


class JiraConfigUpdate(BaseModel):
    jira_domain: str | None = None
    jira_email: str | None = None
    jira_api_token: str | None = None
    default_project_key: str | None = None
    is_active: bool | None = None


class JiraConfigResponse(BaseModel):
    id: uuid.UUID | None = None
    workspace_id: uuid.UUID | None = None
    jira_domain: str
    jira_email: str
    default_project_key: str | None = None
    is_active: bool = True
    is_configured: bool = True
    token_preview: str = Field(..., description="Masked token preview, e.g. ATAT...4x9a")
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_serializer("created_at", "updated_at")
    def serialize_dates(self, dt: datetime | None, _info) -> str | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


class JiraTestConnectionRequest(BaseModel):
    jira_domain: str | None = None
    jira_email: str | None = None
    jira_api_token: str | None = None


class JiraTestConnectionResponse(BaseModel):
    success: bool
    account_id: str | None = None
    display_name: str | None = None
    email_address: str | None = None
    jira_url: str | None = None
    message: str


class JiraProjectItem(BaseModel):
    id: str
    key: str
    name: str
    project_type_key: str = "software"
    avatar_url: str = ""


class JiraIssueTypeItem(BaseModel):
    id: str
    name: str
    description: str = ""
    subtask: bool = False
    icon_url: str = ""


class JiraStatusItem(BaseModel):
    id: str
    name: str
    category_key: str = "undefined"
    category_name: str = "Unknown"


class JiraBoardItem(BaseModel):
    id: int | str
    name: str
    type: str = "kanban"  # "kanban" | "scrum"
    project_key: str | None = None
    project_name: str | None = None


class JiraSprintItem(BaseModel):
    id: int | str
    name: str
    state: str = "active"  # "active" | "future" | "closed"
    goal: str | None = None
    start_date: str | None = None
    end_date: str | None = None



class JiraIssueItem(BaseModel):
    id: str
    key: str
    summary: str
    url: str
    status: str
    status_category: str = "undefined"
    issue_type: str
    issue_type_icon_url: str = ""
    priority: str = "Medium"
    priority_icon_url: str = ""
    project_key: str
    project_name: str = ""
    assignee_name: str | None = None
    updated_at: str | None = None
    created_at: str | None = None
    labels: list[str] = Field(default_factory=list)
    description_preview: str = ""


class JiraSearchResponse(BaseModel):
    total: int
    start_at: int
    max_results: int
    issues: list[JiraIssueItem]


class JiraIssueDetailResponse(BaseModel):
    id: str
    key: str
    summary: str
    url: str
    description_markdown: str
    raw_description: str = ""
    status: str
    status_category: str = "undefined"
    issue_type: str
    issue_type_icon_url: str = ""
    priority: str = "Medium"
    priority_icon_url: str = ""
    project_key: str
    project_name: str = ""
    assignee_name: str | None = None
    reporter_name: str | None = None
    updated_at: str | None = None
    created_at: str | None = None
    labels: list[str] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)


class JiraImportRequest(BaseModel):
    repository_id: uuid.UUID
    issue_key: str = Field(..., description="Jira issue key (e.g. PROJ-123) or URL")
    custom_title: str | None = Field(None, max_length=512, description="Optional custom title override")
    custom_text: str | None = Field(None, min_length=1, description="Optional custom requirement markdown override")


class JiraBatchImportRequest(BaseModel):
    repository_id: uuid.UUID
    issue_keys: list[str] = Field(..., min_length=1, max_length=50, description="List of Jira issue keys to import")


class JiraImportResult(BaseModel):
    requirement_id: uuid.UUID
    title: str
    jira_issue_key: str
    jira_issue_url: str
    jira_status: str | None = None
    jira_issue_type: str | None = None
    version_number: int = 1


class JiraBatchImportResponse(BaseModel):
    imported: list[JiraImportResult]
    failed: list[dict[str, str]]
    total_imported: int
    total_requested: int


class JiraSyncResponse(BaseModel):
    requirement_id: uuid.UUID
    title: str
    version_number: int
    jira_issue_key: str
    jira_status: str | None = None
    was_updated: bool
    message: str


# -----------------------------------------------------------------------
# Phase 2: Transitions, Comment Posting, Webhook
# -----------------------------------------------------------------------


class JiraTransitionItem(BaseModel):
    """A single available workflow transition for a Jira issue."""

    id: str
    name: str
    to_status: str
    to_status_category: str = "undefined"


class JiraTransitionRequest(BaseModel):
    """Request body for transitioning a Jira issue status from TraceIQ."""

    transition_id: str = Field(..., description="Transition ID from GET /issues/{key}/transitions")
    post_comment: bool = Field(
        False, description="Whether to post a comment confirming the transition on Jira"
    )
    comment: str | None = Field(
        None, description="Custom comment text (auto-generated if omitted and post_comment=True)"
    )


class JiraTransitionResponse(BaseModel):
    """Result of a Jira issue status transition."""

    success: bool
    issue_key: str
    new_status: str | None = None
    message: str


class JiraPostCommentRequest(BaseModel):
    """Request body for posting a TraceIQ summary comment to a Jira issue."""

    comment_body: str | None = Field(
        None,
        description="Custom comment Markdown text. If omitted, auto-generates from latest impact analysis.",
    )


class JiraPostCommentResponse(BaseModel):
    """Result of posting a comment to a Jira issue."""

    success: bool
    issue_key: str
    comment_id: str | None = None
    author: str | None = None
    message: str


class JiraWebhookSecretResponse(BaseModel):
    """Webhook secret configuration for the workspace Jira integration."""

    webhook_url: str = Field(..., description="Endpoint URL to register in Jira webhook settings")
    webhook_secret: str = Field(..., description="Shared secret to paste in Jira (shown once)")
    message: str = "Copy the secret above and paste it as the 'Secret' in Jira Webhook settings."


class JiraWebhookPayload(BaseModel):
    """Inbound Jira webhook event payload (permissive — handles many event shapes)."""

    model_config = {"extra": "allow"}

    webhookEvent: str = ""
    issue: dict[str, Any] | None = None
    changelog: dict[str, Any] | None = None
    timestamp: int | None = None
    user: dict[str, Any] | None = None
    comment: dict[str, Any] | None = None
