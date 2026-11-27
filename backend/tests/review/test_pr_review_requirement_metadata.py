"""Unit tests verifying PR review responses include attached requirement metadata."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.modules.requirement.models.req import Requirement
from app.modules.review.models.rev_models import PRReview
from app.modules.review.routes.pr_review import _build_pr_review_response


def test_build_pr_review_response_includes_attached_requirement():
    repo_id = uuid.uuid4()
    req_id = uuid.uuid4()
    review = PRReview(
        id=uuid.uuid4(),
        user_id="user_1",
        repository_id=repo_id,
        requirement_id=req_id,
        pr_number=11,
        pr_title="feat(kan-1): Add Exportable ATS Audit Report",
        pr_html_url="https://github.com/Sri-dinesh/resume-builder-ai/pull/11",
        status="completed",
        summary="Looks good",
        created_at=datetime.now(UTC),
    )
    req = Requirement(
        id=req_id,
        user_id="user_1",
        repository_id=repo_id,
        title="[KAN-1] Add Exportable ATS Audit Report",
        text="Spec",
        version_number=2,
        jira_issue_key="KAN-1",
        jira_issue_url="https://example.atlassian.net/browse/KAN-1",
        jira_status="In Progress",
    )

    resp = _build_pr_review_response(review, "Sri-dinesh/resume-builder-ai", None, None, req)

    assert resp.requirement_id == req_id
    assert resp.requirement_title == "[KAN-1] Add Exportable ATS Audit Report"
    assert resp.requirement_jira_issue_key == "KAN-1"
    assert resp.requirement_jira_issue_url == "https://example.atlassian.net/browse/KAN-1"
    assert resp.requirement_jira_status == "In Progress"
    assert resp.requirement_version_number == 2


def test_build_pr_review_response_without_requirement():
    review = PRReview(
        id=uuid.uuid4(),
        user_id="user_1",
        repository_id=uuid.uuid4(),
        requirement_id=None,
        pr_number=12,
        pr_title="chore: update deps",
        pr_html_url="https://github.com/Sri-dinesh/resume-builder-ai/pull/12",
        status="queued",
        created_at=datetime.now(UTC),
    )

    resp = _build_pr_review_response(review, "Sri-dinesh/resume-builder-ai", None, None, None)

    assert resp.requirement_id is None
    assert resp.requirement_title is None
    assert resp.requirement_jira_issue_key is None
