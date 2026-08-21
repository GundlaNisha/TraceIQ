from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer


class TraceabilityFindingSummary(BaseModel):
    high: int = 0
    medium: int = 0
    low: int = 0
    total: int = 0
    gaps_count: int = 0


class TraceabilityReviewItem(BaseModel):
    id: UUID
    pr_number: int
    pr_title: str
    pr_html_url: str
    status: str
    summary: str | None = None
    finding_counts: TraceabilityFindingSummary
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()


class TraceabilityAnalysisItem(BaseModel):
    id: UUID
    status: str
    impacted_files_count: int = 0
    high_risk_count: int = 0
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()


class TraceabilityRow(BaseModel):
    requirement_id: UUID
    title: str
    version_number: int
    text: str
    repository_id: UUID
    repository_name: str
    created_at: datetime
    compliance_status: (
        str  # "verified", "gaps_flagged", "in_progress", "pending_verification"
    )
    compliance_score: int  # 0 to 100
    latest_analysis: TraceabilityAnalysisItem | None = None
    reviews: list[TraceabilityReviewItem] = []

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


class TraceabilitySummary(BaseModel):
    total_requirements: int
    verified_count: int
    gaps_count: int
    in_progress_count: int
    pending_count: int
    overall_coverage_pct: int


class TraceabilityMatrixResponse(BaseModel):
    summary: TraceabilitySummary
    items: list[TraceabilityRow]
