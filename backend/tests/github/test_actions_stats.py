"""Unit tests for workflow-run stats summarization (pure, no DB/network)."""

from app.modules.github.services.checks import summarize_workflow_runs


def _run(name="CI", status="completed", conclusion="success",
         created="2026-09-01T00:00:00Z", updated="2026-09-01T00:02:00Z",
         branch="main"):
    return {
        "id": 1,
        "name": name,
        "head_branch": branch,
        "event": "push",
        "status": status,
        "conclusion": conclusion,
        "created_at": created,
        "updated_at": updated,
        "actor": {"login": "octocat"},
        "html_url": "https://github.com/acme/repo/actions/runs/1",
    }


def test_empty_runs():
    s = summarize_workflow_runs([])
    assert s["total"] == 0
    assert s["success_rate"] is None
    assert s["avg_duration_s"] is None
    assert s["runs"] == []


def test_success_rate_and_avg_duration():
    s = summarize_workflow_runs([
        _run("CI", updated="2026-09-01T00:02:00Z"),   # 120s success
        _run("CI", updated="2026-09-01T00:04:00Z"),   # 240s success
        _run("Lint", conclusion="failure"),           # 120s failure
    ])
    assert s["total"] == 3
    assert s["completed"] == 3
    assert s["success"] == 2
    assert s["failure"] == 1
    assert s["success_rate"] == 67  # round(200/3)
    assert s["avg_duration_s"] == 160  # (120+240+120)/3


def test_in_progress_excluded_from_rate():
    s = summarize_workflow_runs([
        _run("CI"),
        _run("Deploy", status="in_progress", conclusion=None,
             updated="2026-09-01T00:00:00Z"),
    ])
    assert s["pending"] == 1
    assert s["completed"] == 1
    assert s["success_rate"] == 100
    # in-progress run keeps bucket pending with zero duration
    pending = [r for r in s["runs"] if r["bucket"] == "pending"]
    assert len(pending) == 1
    assert pending[0]["duration_s"] == 0


def test_per_workflow_breakdown():
    s = summarize_workflow_runs([
        _run("CI"),
        _run("CI", conclusion="failure"),
        _run("Lint"),
    ])
    assert s["by_workflow"]["CI"]["total"] == 2
    assert s["by_workflow"]["CI"]["success"] == 1
    assert s["by_workflow"]["CI"]["failure"] == 1
    assert s["by_workflow"]["Lint"]["total"] == 1
    assert s["by_workflow"]["Lint"]["success"] == 1
    assert s["by_workflow"]["Lint"]["failure"] == 0


def test_run_normalization():
    s = summarize_workflow_runs([_run("CI", branch="feat/x")])
    run = s["runs"][0]
    assert run["branch"] == "feat/x"
    assert run["actor"] == "octocat"
    assert run["duration_s"] == 120
    assert run["bucket"] == "success"
    assert run["html_url"].startswith("https://github.com")
