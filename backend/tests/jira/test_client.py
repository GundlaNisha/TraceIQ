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
