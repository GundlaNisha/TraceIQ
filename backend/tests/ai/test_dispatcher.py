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
