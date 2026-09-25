"""Unit tests for reliability analysis: flaky detection, MTTR, streaks."""

from app.modules.github.services.checks import (
    analyze_reliability,
    summarize_workflow_runs,
)


def _n(name, bucket, created):
    return {"name": name, "bucket": bucket, "created_at": created}


def test_flaky_workflow_detected_on_recovery():
    runs = [
        _n("CI", "failure", "2026-09-01T00:00:00Z"),
        _n("CI", "success", "2026-09-01T01:00:00Z"),
    ]
    reliability, _ = analyze_reliability(runs)
    assert reliability["flaky_workflows"] == [{"name": "CI", "recoveries": 1}]
    assert reliability["recovered_episodes"] == 1
    assert reliability["mttr_s"] == 3600


def test_stable_workflow_not_flaky():
    runs = [
        _n("CI", "success", "2026-09-01T00:00:00Z"),
        _n("CI", "success", "2026-09-01T01:00:00Z"),
    ]
    reliability, _ = analyze_reliability(runs)
    assert reliability["flaky_workflows"] == []
    assert reliability["mttr_s"] is None


def test_open_failure_not_counted_in_mttr():
    runs = [_n("Deploy", "failure", "2026-09-01T00:00:00Z")]
    reliability, _ = analyze_reliability(runs)
    assert reliability["mttr_s"] is None
    assert reliability["open_failures"] == ["Deploy"]
    assert reliability["flaky_workflows"] == []


def test_streaks_newest_first():
    runs = [
        _n("CI", "success", "2026-09-01T00:00:00Z"),
        _n("CI", "failure", "2026-09-01T01:00:00Z"),
        _n("CI", "failure", "2026-09-01T02:00:00Z"),
    ]
    _, streaks = analyze_reliability(runs)
    assert streaks["CI"] == {"streak": 2, "streak_type": "failing", "last_rate": 33}


def test_empty_reliability():
    reliability, streaks = analyze_reliability([])
    assert reliability == {
        "mttr_s": None,
        "recovered_episodes": 0,
        "open_failures": [],
        "flaky_workflows": [],
    }
    assert streaks == {}


def test_summary_includes_reliability():
    s = summarize_workflow_runs([])
    assert s["reliability"] == {
        "mttr_s": None,
        "recovered_episodes": 0,
        "open_failures": [],
        "flaky_workflows": [],
    }
