"""Unit tests for CI x blast-radius correlation (pure, no DB/network)."""

from app.modules.github.services.checks import (
    build_ci_context,
    correlate_ci_with_blast_radius,
)


def _fail(name):
    return {"name": name, "status": "completed", "conclusion": "failure", "bucket": "failure"}


def _ok(name):
    return {"name": name, "status": "completed", "conclusion": "success", "bucket": "success"}


def _file(path):
    return {"file_path": path}


def test_clean_when_no_failures():
    corr = correlate_ci_with_blast_radius(
        [_ok("lint"), _ok("pytest")], [_file("auth/guard.py")]
    )
    assert corr["verdict"] == "clean"
    assert corr["in_blast_radius"] == []
    assert corr["unrelated"] == []


def test_failing_check_matching_impacted_file():
    corr = correlate_ci_with_blast_radius(
        [_fail("pytest-auth"), _ok("lint")],
        [_file("auth/guard.py"), _file("payments/charge.py")],
    )
    assert corr["verdict"] == "in_scope"
    assert len(corr["in_blast_radius"]) == 1
    assert corr["in_blast_radius"][0]["check_name"] == "pytest-auth"
    assert "auth/guard.py" in corr["in_blast_radius"][0]["matched_files"]
    assert "payments/charge.py" not in corr["in_blast_radius"][0]["matched_files"]
    assert corr["unrelated"] == []


def test_failing_check_outside_impact_is_unrelated():
    corr = correlate_ci_with_blast_radius(
        [_fail("deploy-docs")], [_file("auth/guard.py")]
    )
    assert corr["verdict"] == "unrelated"
    assert corr["unrelated"] == ["deploy-docs"]


def test_noise_tokens_do_not_match():
    # "test" must not substring-match "latest/models.py"
    corr = correlate_ci_with_blast_radius(
        [_fail("ci-test")], [_file("latest/models.py")]
    )
    assert corr["verdict"] == "unrelated"


def test_build_ci_context_success():
    ctx = build_ci_context(
        {"state": "success", "total": 3, "success": 3, "failure": 0,
         "pending": 0, "checks": [], "head_sha": "abc1234"},
        [],
    )
    assert "SUCCESS" in ctx
    assert "3 passed" in ctx


def test_build_ci_context_failure_mentions_blast_radius():
    ctx = build_ci_context(
        {
            "state": "failure", "total": 2, "success": 1, "failure": 1,
            "pending": 0, "head_sha": "abc1234",
            "checks": [_fail("pytest-auth"), _ok("lint")],
        },
        [_file("auth/guard.py")],
    )
    assert "FAILURE" in ctx
    assert "pytest-auth" in ctx
    assert "auth/guard.py" in ctx
    assert "not" in ctx and "safe to merge" in ctx


def test_build_ci_context_unknown():
    ctx = build_ci_context(
        {"state": "unknown", "total": 0, "success": 0, "failure": 0,
         "pending": 0, "checks": []},
        [],
    )
    assert "unknown" in ctx.lower()
