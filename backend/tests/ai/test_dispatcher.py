from unittest.mock import patch

import pytest

from app.ai.parsers.schemas import ImpactAnalysisOutput
from app.ai.router.dispatcher import dispatch_impact_analysis


@pytest.mark.asyncio
@patch("app.ai.router.dispatcher._adapter.complete")
async def test_dispatch_impact_analysis(mock_complete):
    # Setup mock to return a pydantic model directly, since LiteLLMAdapter.complete
    # normally parses the LLM output into the requested Pydantic model type.
    mock_result = ImpactAnalysisOutput(
        impacted_files=[
            {
                "file_path": "src/main.py",
                "confidence": 0.9,
                "reasoning": "Needs login route",
                "related_symbols": ["login_route"],
                "related_tests": ["test_login.py"],
            }
        ]
    )
    mock_complete.return_value = mock_result

    req_text = "Add a login screen"
    chunks = [{"file_path": "src/main.py", "chunk_text": "def login(): pass"}]

    # Call the dispatcher
    result = await dispatch_impact_analysis(req_text, chunks)

    # Verify the LLM was called
    mock_complete.assert_called_once()

    # Verify the result
    assert isinstance(result, ImpactAnalysisOutput)
    assert len(result.impacted_files) == 1
    assert result.impacted_files[0].file_path == "src/main.py"
    assert result.impacted_files[0].confidence == 0.9


from app.ai.parsers.schemas import PRReviewFindingOutput, PRReviewOutput
from app.ai.router.dispatcher import dispatch_pr_review


@pytest.mark.asyncio
@patch("app.ai.router.dispatcher._adapter.complete")
async def test_dispatch_pr_review(mock_complete):
    mock_result = PRReviewOutput(
        summary="PR implements requirement with minor missing test.",
        findings=[
            PRReviewFindingOutput(
                file_path="src/main.py",
                line_number=10,
                severity="medium",
                message="Missing unit test for swipe handler",
                requirement_gap="Swipe gestures requirement lacks test coverage",
            )
        ],
    )
    mock_complete.return_value = mock_result

    result = await dispatch_pr_review(
        pr_title="feat: Add swipe controls",
        pr_diff="diff --git a/main.py b/main.py\n+ def swipe(): pass",
        requirement_text="Swipe controls for mobile",
        analysis_context="Expected impact on src/main.py",
    )

    mock_complete.assert_called_once()
    assert isinstance(result, PRReviewOutput)
    assert len(result.findings) == 1
    assert result.findings[0].requirement_gap is not None
