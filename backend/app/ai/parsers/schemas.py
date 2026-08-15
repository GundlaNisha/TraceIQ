from pydantic import BaseModel


class ImpactedFile(BaseModel):
    file_path: str
    confidence: float  # 0.0 to 1.0
    reasoning: str
    related_symbols: list[str]
    related_tests: list[str]


class ImpactAnalysisOutput(BaseModel):
    impacted_files: list[ImpactedFile]


class ReviewFindingOutput(BaseModel):
    file_path: str
    line_number: int | None
    severity: str  # high | medium | low
    message: str


class CommitReviewOutput(BaseModel):
    findings: list[ReviewFindingOutput]
    summary: str


class PRDraftOutput(BaseModel):
    title: str
    description_markdown: str


class PRReviewFindingOutput(BaseModel):
    file_path: str
    line_number: int | None
    severity: str  # high | medium | low
    message: str
    requirement_gap: (
        str | None
    )  # How this finding violates the stated requirement (if any)


class PRReviewOutput(BaseModel):
    findings: list[PRReviewFindingOutput]
    summary: str  # Overall AI summary of the PR review
