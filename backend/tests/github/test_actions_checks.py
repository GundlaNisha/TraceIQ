"""Unit tests for GitHub Actions / Checks summarization.

Pure-function tests (no DB, no network): summarize_checks maps raw
check-run payloads to the UI badge states.
"""

from app.modules.github.services.checks import summarize_checks


def _run(name="ci / test", status="completed", conclusion="success"):
    return {
        "name": name,
        "status": status,
        "conclusion": conclusion,
        "started_at": "2026-09-01T00:00:00Z",
        "completed_at": "2026-09-01T00:01:00Z",
        "html_url": "https://github.com/acme/repo/actions/runs/1",
    }


def test_empty_runs_is_unknown():
    summary = summarize_checks([])
    assert summary["state"] == "unknown"
    assert summary["total"] == 0
    assert summary["checks"] == []


def test_all_success():
    summary = summarize_checks([_run("lint"), _run("pytest")])
    assert summary["state"] == "success"
    assert summary["success"] == 2
    assert summary["failure"] == 0
    assert summary["pending"] == 0


def test_any_failure_is_red():
    summary = summarize_checks(
        [_run("lint"), _run("pytest", conclusion="failure")]
    )
    assert summary["state"] == "failure"
    assert summary["failure"] == 1
    assert summary["success"] == 1


def test_timed_out_counts_as_failure():
    summary = summarize_checks([_run("e2e", conclusion="timed_out")])
    assert summary["state"] == "failure"
    assert summary["failure"] == 1


def test_in_progress_is_pending_not_red():
    summary = summarize_checks([_run("build", status="in_progress", conclusion=None)])
    assert summary["state"] == "pending"
    assert summary["pending"] == 1
    assert summary["failure"] == 0


def test_neutral_and_skipped_are_pending():
    summary = summarize_checks(
        [_run("lint"), _run("optional", conclusion="neutral")]
    )
    assert summary["state"] == "pending"
    assert summary["failure"] == 0


def test_cancelled_does_not_turn_red():
    summary = summarize_checks([_run("deploy", conclusion="cancelled")])
    assert summary["state"] == "pending"
    assert summary["failure"] == 0
