"""Unit tests for JiraClient and URL normalization."""

import pytest
from app.integrations.jira.client import JiraApiError, JiraClient, normalize_jira_url


def test_normalize_jira_url():
    assert normalize_jira_url("mycompany.atlassian.net") == "https://mycompany.atlassian.net"
    assert normalize_jira_url("https://mycompany.atlassian.net/") == "https://mycompany.atlassian.net"
    assert normalize_jira_url("http://jira.internal.corp:8080/") == "http://jira.internal.corp:8080"

    with pytest.raises(JiraApiError):
        normalize_jira_url("")


def test_jira_client_headers():
    client = JiraClient(
        domain="https://testorg.atlassian.net",
        email="developer@example.com",
        api_token="test-api-token-12345",
    )
    headers = client._headers()
    assert headers["Accept"] == "application/json"
    assert headers["Content-Type"] == "application/json"
    assert headers["Authorization"].startswith("Basic ")


def test_markdown_to_adf():
    client = JiraClient(
        domain="https://testorg.atlassian.net",
        email="developer@example.com",
        api_token="test-token",
    )
    text = (
        "## TraceIQ Analysis\n"
        "Here is a summary:\n"
        "- Impacted 3 files\n"
        "- Risk score: High\n"
        "> Critical review required\n"
        "```python\ndef test(): pass\n```\n"
        "Link: [Documentation](https://docs.traceiq.dev)"
    )
    adf = client._markdown_to_adf(text)
    assert adf["type"] == "doc"
    assert adf["version"] == 1
    assert len(adf["content"]) > 0

    # Test heading
    heading_node = next((n for n in adf["content"] if n.get("type") == "heading"), None)
    assert heading_node is not None
    assert heading_node["attrs"]["level"] == 2
    assert heading_node["content"][0]["text"] == "TraceIQ Analysis"

    # Test bullet list
    list_node = next((n for n in adf["content"] if n.get("type") == "bulletList"), None)
    assert list_node is not None
    assert len(list_node["content"]) == 2

    # Test blockquote
    quote_node = next((n for n in adf["content"] if n.get("type") == "blockquote"), None)
    assert quote_node is not None

    # Test code block
    code_node = next((n for n in adf["content"] if n.get("type") == "codeBlock"), None)
    assert code_node is not None
    assert code_node["attrs"]["language"] == "python"


@pytest.mark.asyncio
async def test_post_comment():
    from unittest.mock import AsyncMock, patch

    client = JiraClient(
        domain="https://testorg.atlassian.net",
        email="developer@example.com",
        api_token="test-token",
    )

    mock_json_response = {
        "id": "10050",
        "author": {"displayName": "TraceIQ Bot"},
        "created": "2026-08-31T12:00:00.000+0000",
    }

    with patch.object(client, "_request", new_callable=AsyncMock, return_value=mock_json_response) as mock_req:
        res = await client.post_comment("PROJ-123", "Test comment body")
        assert res["comment_id"] == "10050"
        assert res["author"] == "TraceIQ Bot"
        mock_req.assert_called_once()
        args, kwargs = mock_req.call_args
        assert args[0] == "POST"
        assert args[1] == "/rest/api/3/issue/PROJ-123/comment"


@pytest.mark.asyncio
async def test_get_issue_transitions():
    from unittest.mock import AsyncMock, patch

    client = JiraClient(
        domain="https://testorg.atlassian.net",
        email="developer@example.com",
        api_token="test-token",
    )

    mock_json_response = {
        "transitions": [
            {
                "id": "21",
                "name": "In Progress",
                "to": {
                    "name": "In Progress",
                    "statusCategory": {"key": "indeterminate"},
                },
            },
            {
                "id": "31",
                "name": "Done",
                "to": {
                    "name": "Done",
                    "statusCategory": {"key": "done"},
                },
            },
        ]
    }

    with patch.object(client, "_request", new_callable=AsyncMock, return_value=mock_json_response) as mock_req:
        transitions = await client.get_issue_transitions("PROJ-123")
        assert len(transitions) == 2
        assert transitions[0]["id"] == "21"
        assert transitions[0]["name"] == "In Progress"
        assert transitions[0]["to_status"] == "In Progress"
        assert transitions[0]["to_status_category"] == "indeterminate"
        assert transitions[1]["id"] == "31"
        assert transitions[1]["to_status"] == "Done"
        mock_req.assert_called_once_with("GET", "/rest/api/3/issue/PROJ-123/transitions")


@pytest.mark.asyncio
async def test_transition_issue():
    from unittest.mock import AsyncMock, patch

    client = JiraClient(
        domain="https://testorg.atlassian.net",
        email="developer@example.com",
        api_token="test-token",
    )

    with patch.object(client, "_request", new_callable=AsyncMock, return_value={}) as mock_req:
        await client.transition_issue("PROJ-123", "31")
        mock_req.assert_called_once_with(
            "POST",
            "/rest/api/3/issue/PROJ-123/transitions",
            json_data={"transition": {"id": "31"}},
        )

