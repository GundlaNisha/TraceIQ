"""Tests for Jira Cloud /rest/api/3/search/jql client and idempotent requirement import."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.integrations.jira.client import JiraApiError, JiraClient
from app.modules.jira.services.jira_service import (
    _upsert_jira_requirement,
    handle_jira_webhook,
    sync_all_jira_requirements,
)
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement, RequirementVersion


def _make_raw_issue(key: str, summary: str) -> dict:
    return {
        "id": f"id-{key}",
        "key": key,
        "fields": {
            "summary": summary,
            "description": None,
            "status": {"name": "To Do", "statusCategory": {"name": "To Do"}},
            "issuetype": {"name": "Story", "iconUrl": ""},
            "priority": {"name": "High", "iconUrl": ""},
            "project": {"key": key.split("-")[0], "name": "My Kanban Space"},
            "assignee": None,
            "updated": "2026-11-27T12:00:00+0000",
            "created": "2026-11-27T11:00:00+0000",
            "labels": [],
        },
    }


@pytest.mark.asyncio
async def test_search_issues_uses_search_jql_with_bounded_default():
    client = JiraClient(
        domain="https://example.atlassian.net",
        auth_type="oauth2",
        access_token="tok",
        cloud_id="cloud-1",
    )
    mock_payload = {
        "issues": [_make_raw_issue("KAN-1", "Story 1"), _make_raw_issue("KAN-2", "Story 2")],
        "isLast": True,
    }
    client._request = AsyncMock(return_value=mock_payload)  # type: ignore[method-assign]

    res = await client.search_issues(max_results=100)

    client._request.assert_awaited_once()
    method, path = client._request.call_args.args[:2]
    params = client._request.call_args.kwargs["params"]
    assert method == "GET"
    assert path == "/rest/api/3/search/jql"
    assert params["jql"] == "issuetype IS NOT EMPTY ORDER BY updated DESC"
    assert "startAt" not in params
    assert params["maxResults"] == 100
    assert isinstance(params["fields"], str)
    assert res["total"] == 2
    assert [i["key"] for i in res["issues"]] == ["KAN-1", "KAN-2"]


@pytest.mark.asyncio
async def test_search_issues_falls_back_to_legacy_search_on_404():
    client = JiraClient(domain="https://jira.internal", email="u@example.com", api_token="t")
    client._request = AsyncMock(  # type: ignore[method-assign]
        side_effect=[
            JiraApiError("Not found", status_code=404),
            {"issues": [_make_raw_issue("LEG-1", "Legacy issue")], "total": 1, "startAt": 0, "maxResults": 25},
        ]
    )

    res = await client.search_issues(project_key="LEG", max_results=25)

    assert client._request.await_count == 2
    assert client._request.call_args_list[0].args[1] == "/rest/api/3/search/jql"
    assert client._request.call_args_list[1].args[1] == "/rest/api/3/search"
    assert res["total"] == 1
    assert res["issues"][0]["key"] == "LEG-1"


@pytest.mark.asyncio
async def test_upsert_jira_requirement_deduplicates_existing_issue():
    repo_id = uuid.uuid4()
    ws_id = uuid.uuid4()
    repo = MagicMock(spec=Repository)
    repo.id = repo_id
    repo.workspace_id = ws_id

    existing = Requirement(
        id=uuid.uuid4(),
        user_id="user_1",
        repository_id=repo_id,
        workspace_id=ws_id,
        title="[KAN-1] Old Summary",
        text="Old description",
        version_number=1,
        jira_issue_key="KAN-1",
        jira_status="To Do",
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = existing
    mock_db.execute.return_value = mock_res

    issue = {
        "id": "10001",
        "key": "KAN-1",
        "summary": "New Summary",
        "url": "https://example.atlassian.net/browse/KAN-1",
        "description_markdown": "Updated markdown spec",
        "status": "In Progress",
        "priority": "High",
        "issue_type": "Story",
    }

    with patch("app.modules.jira.services.jira_service.create_requirement", new_callable=AsyncMock) as mock_create:
        req = await _upsert_jira_requirement(
            db=mock_db,
            user_id="user_1",
            repo=repo,
            workspace_id=ws_id,
            issue=issue,
        )

    mock_create.assert_not_awaited()
    assert req is existing
    assert existing.version_number == 2
    assert existing.title == "[KAN-1] New Summary"
    assert existing.text == "Updated markdown spec"
    assert existing.jira_status == "In Progress"
    mock_db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_jira_webhook_auto_resyncs_summary_and_description():
    req = Requirement(
        id=uuid.uuid4(),
        user_id="user_test_a",
        repository_id=uuid.uuid4(),
        title="[KAN-1] Old Title",
        text="Old requirement text",
        version_number=1,
        jira_issue_key="KAN-1",
        jira_status="To Do",
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [req]
    mock_db.execute.return_value = mock_res

    issue_data = {
        "key": "KAN-1",
        "fields": {
            "summary": "Updated Title from Jira",
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Updated body from Jira"}],
                    }
                ],
            },
            "status": {"name": "In Progress"},
        },
    }
    changelog = {"items": [{"field": "summary", "fromString": "Old Title", "toString": "Updated Title from Jira"}]}

    res = await handle_jira_webhook(
        db=mock_db,
        event_type="jira:issue_updated",
        issue_data=issue_data,
        changelog=changelog,
    )

    assert res["success"] is True
    assert res["drift_detected"] is True
    assert req.title == "[KAN-1] Updated Title from Jira"
    assert req.text == "Updated body from Jira"
    assert req.jira_status == "In Progress"
    assert req.version_number == 2
    added = [c.args[0] for c in mock_db.add.call_args_list]
    versions = [obj for obj in added if isinstance(obj, RequirementVersion)]
    assert len(versions) == 1
    assert versions[0].version_number == 2


@pytest.mark.asyncio
async def test_sync_all_jira_requirements_updates_changed_items():
    req = Requirement(
        id=uuid.uuid4(),
        user_id="user_1",
        repository_id=uuid.uuid4(),
        title="[KAN-1] Old Title",
        text="Old body",
        version_number=1,
        jira_issue_key="KAN-1",
        jira_status="To Do",
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [req]
    mock_db.execute.return_value = mock_res

    mock_client = MagicMock()
    mock_client.get_issues_by_keys = AsyncMock(
        return_value={
            "KAN-1": {
                "key": "KAN-1",
                "summary": "New Title",
                "description_markdown": "Updated body",
                "status": "In Review",
                "priority": "High",
                "issue_type": "Story",
            }
        }
    )

    mock_integ = MagicMock(is_active=True)

    with (
        patch("app.modules.jira.services.jira_service.get_jira_integration", new_callable=AsyncMock, return_value=mock_integ),
        patch("app.modules.jira.services.jira_service.get_active_jira_client", new_callable=AsyncMock, return_value=(mock_client, mock_integ)),
        patch("app.core.cache.cache.get", new_callable=AsyncMock, return_value=None),
        patch("app.core.cache.cache.set", new_callable=AsyncMock, return_value=True),
    ):
        res = await sync_all_jira_requirements(db=mock_db, user_id="user_1", force=False)

    assert res.checked == 1
    assert res.updated == 1
    assert res.updated_keys == ["KAN-1"]
    assert req.title == "[KAN-1] New Title"
    assert req.text == "Updated body"
    assert req.jira_status == "In Review"
    assert req.version_number == 2
    mock_db.commit.assert_awaited_once()
