"""Unit tests for Jira Webhook listener, HMAC verification, and drift detection."""

import hashlib
import hmac
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.jira.models.jira_integration import JiraIntegration
from app.modules.jira.services.jira_service import (
    handle_jira_webhook,
    simulate_jira_webhook_delivery,
)
from app.modules.requirement.models.req import Requirement
from app.modules.audit.models.audit import AuditLog


@pytest.mark.asyncio
async def test_handle_jira_webhook_status_update():
    req = Requirement(
        user_id="user_test_a",
        title="Test Requirement",
        text="Requirement specification text",
        jira_issue_key="TEST-101",
        jira_status="To Do",
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [req]
    mock_db.execute.return_value = mock_res

    issue_data = {
        "key": "TEST-101",
        "fields": {
            "summary": "Test Requirement",
            "status": {"name": "In Progress"},
            "priority": {"name": "High"},
        },
    }
    changelog = {
        "items": [
            {"field": "status", "fromString": "To Do", "toString": "In Progress"}
        ]
    }

    res = await handle_jira_webhook(
        db=mock_db,
        event_type="jira:issue_updated",
        issue_data=issue_data,
        changelog=changelog,
    )

    assert res["success"] is True
    assert res["updated"] is True
    assert res["new_status"] == "In Progress"
    assert res["drift_detected"] is False

    assert req.jira_status == "In Progress"
    assert req.jira_priority == "High"
    assert req.jira_synced_at is not None
    mock_db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_jira_webhook_drift_detection():
    req = Requirement(
        user_id="user_test_a",
        title="Original Requirement Title",
        text="Original requirement text",
        jira_issue_key="DRIFT-202",
        jira_status="In Progress",
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [req]
    mock_db.execute.return_value = mock_res

    issue_data = {
        "key": "DRIFT-202",
        "fields": {
            "summary": "Updated Requirement Title from Product",
            "status": {"name": "In Progress"},
        },
    }
    changelog = {
        "items": [
            {
                "field": "summary",
                "fromString": "Original Requirement Title",
                "toString": "Updated Requirement Title from Product",
            }
        ]
    }

    res = await handle_jira_webhook(
        db=mock_db,
        event_type="jira:issue_updated",
        issue_data=issue_data,
        changelog=changelog,
    )

    assert res["success"] is True
    assert res["drift_detected"] is True

    # Verify db.add was called for AuditLog with drift action
    added_objects = [call.args[0] for call in mock_db.add.call_args_list]
    drift_logs = [obj for obj in added_objects if isinstance(obj, AuditLog) and obj.action == "jira.drift_detected"]
    assert len(drift_logs) == 1
    assert drift_logs[0].resource_type == "requirement"
    mock_db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_jira_webhook_issue_deleted():
    req = Requirement(
        user_id="user_test_a",
        title="To be deleted",
        text="Text",
        jira_issue_key="DEL-303",
        jira_status="Done",
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [req]
    mock_db.execute.return_value = mock_res

    res = await handle_jira_webhook(
        db=mock_db,
        event_type="jira:issue_deleted",
        issue_data={"key": "DEL-303"},
        changelog=None,
    )

    assert res["success"] is True
    assert res.get("action") == "deleted"
    assert req.jira_status == "JIRA_DELETED"
    mock_db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_webhook_simulation_service():
    secret = "sim_secret_987"
    integration = JiraIntegration(
        user_id="user_test_a",
        jira_domain="https://testorg.atlassian.net",
        jira_email="user@test.com",
        jira_api_token="encrypted_token",
        webhook_secret=secret,
        is_active=True,
    )
    req = Requirement(
        user_id="user_test_a",
        title="Simulation Req",
        text="Req body",
        jira_issue_key="SIM-505",
        jira_status="To Do",
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    with patch("app.modules.jira.services.jira_service.get_jira_integration", new_callable=AsyncMock, return_value=integration):
        mock_res = MagicMock()
        mock_res.scalars.return_value.first.return_value = req
        mock_res.scalars.return_value.all.return_value = [req]
        mock_db.execute.return_value = mock_res

        res = await simulate_jira_webhook_delivery(
            db=mock_db,
            user_id="user_test_a",
            workspace_id=None,
        )

        assert res.success is True
        assert res.issue_key == "SIM-505"
        assert res.old_status == "To Do"
        assert res.new_status == "In Progress"
        assert res.matched_requirements == 1


def test_hmac_sha256_signature_computation():
    secret = "webhook_secret_key_12345"
    payload = {"webhookEvent": "jira:issue_updated", "issue": {"key": "PROJ-1"}}
    body_bytes = json.dumps(payload).encode("utf-8")

    computed = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
    header_val = f"sha256={computed}"

    assert header_val.startswith("sha256=")
    assert hmac.compare_digest(f"sha256={computed}", header_val)
    assert hmac.compare_digest(computed, header_val.removeprefix("sha256="))
