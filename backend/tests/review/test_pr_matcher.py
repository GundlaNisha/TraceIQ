import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement
from app.modules.review.services.pr_matcher import (
    extract_jira_keys,
    resolve_requirement_for_pr,
)


def test_extract_jira_keys_from_titles_and_branches():
    # Standard format
    assert extract_jira_keys("feat: implement RES-45 resume auto-save") == ["RES-45"]

    # Branch format with lowercase
    assert extract_jira_keys("feature/proj-102-new-auth") == ["PROJ-102"]

    # Multiple keys, deduplication
    text = "Addresses PROJ-102 and fixes RES-45. Also relates to proj-102."
    assert extract_jira_keys(text) == ["PROJ-102", "RES-45"]

    # False positive filtering (UTF-8, SHA-256, HTTP-2, MD-5, PR-1)
    text_fp = "Bump UTF-8 encoding, SHA-256 digests, HTTP-2 protocol and PR-12 for TICK-999"
    assert extract_jira_keys(text_fp) == ["TICK-999"]

    # Empty text
    assert extract_jira_keys("") == []


@pytest.mark.asyncio
async def test_resolve_requirement_exact_jira_match():
    repo = Repository(
        id=uuid.uuid4(),
        user_id="user_test_a",
        name="test/repo",
        repo_url="https://github.com/test/repo",
        auto_review_prs=True,
    )
    existing_req = Requirement(
        id=uuid.uuid4(),
        user_id="user_test_a",
        repository_id=repo.id,
        title="[RES-45] Resume Auto Save",
        text="Auto save draft resume",
        jira_issue_key="RES-45",
    )

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = existing_req
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_result

    req, method = await resolve_requirement_for_pr(
        db=mock_db,
        repository=repo,
        pr_title="feat(RES-45): resume auto-save draft",
        pr_body="Fixes RES-45",
        head_ref="feature/RES-45-auto-save",
        pr_number=12,
    )

    assert req.id == existing_req.id
    assert method == "exact_jira_match"


@pytest.mark.asyncio
async def test_resolve_requirement_jit_jira_import():
    repo = Repository(
        id=uuid.uuid4(),
        user_id="user_test_a",
        name="test/repo",
        repo_url="https://github.com/test/repo",
        workspace_id=uuid.uuid4(),
        auto_review_prs=True,
    )
    imported_req = Requirement(
        id=uuid.uuid4(),
        user_id="user_test_a",
        repository_id=repo.id,
        title="[PROJ-999] Live JIT ticket",
        text="Imported from Jira Cloud API",
        jira_issue_key="PROJ-999",
    )

    mock_db = AsyncMock()
    # First search for existing req returns None
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_result
    mock_db.get.return_value = imported_req

    with (
        patch(
            "app.modules.review.services.pr_matcher.get_jira_integration",
            new_callable=AsyncMock,
        ) as mock_get_integ,
        patch(
            "app.modules.review.services.pr_matcher.import_jira_issue",
            new_callable=AsyncMock,
        ) as mock_import_issue,
    ):
        mock_integ = MagicMock(is_active=True)
        mock_get_integ.return_value = mock_integ
        mock_import_issue.return_value = MagicMock(requirement_id=imported_req.id)

        req, method = await resolve_requirement_for_pr(
            db=mock_db,
            repository=repo,
            pr_title="feat: implement PROJ-999",
            pr_body="Resolves PROJ-999",
            head_ref="feature/PROJ-999-new-flow",
            pr_number=45,
        )

        assert req.id == imported_req.id
        assert method == "jit_jira_import"
        mock_import_issue.assert_awaited_once()


@pytest.mark.asyncio
async def test_resolve_requirement_autonomous_synthesis_fallback():
    repo = Repository(
        id=uuid.uuid4(),
        user_id="user_test_a",
        name="test/repo",
        repo_url="https://github.com/test/repo",
        auto_review_prs=True,
    )

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    synthesized_req = Requirement(
        id=uuid.uuid4(),
        user_id="user_test_a",
        repository_id=repo.id,
        title="[PR #10] Add Stripe webhook handler",
        text="Autonomous synthesized requirement text",
    )

    with (
        patch(
            "app.modules.review.services.pr_matcher.get_jira_integration",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch(
            "app.modules.review.services.pr_matcher.create_requirement",
            new_callable=AsyncMock,
            return_value=synthesized_req,
        ) as mock_create_req,
    ):
        req, method = await resolve_requirement_for_pr(
            db=mock_db,
            repository=repo,
            pr_title="Add Stripe webhook handler",
            pr_body="Implements webhook signature verification and event logging.",
            head_ref="feature/stripe-webhooks",
            pr_number=10,
        )

        assert req.id == synthesized_req.id
        assert method == "synthesized_from_pr"
        mock_create_req.assert_awaited_once()
