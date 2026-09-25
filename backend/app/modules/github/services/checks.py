"""GitHub Actions / Checks helpers.

Fetches CI status (check runs + combined commit status) for a PR's head SHA
and normalizes it into a small summary the frontend can render as a badge.

All GitHub I/O lives here so routes stay thin and logic stays unit-testable
without a database.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)

API_ROOT = "https://api.github.com"
_TIMEOUT = 15.0


def _headers(token: str | None) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def summarize_checks(check_runs: list[dict[str, Any]]) -> dict[str, Any]:
    """Collapse raw check-run payloads into a UI-friendly summary.

    Mapping:
    - conclusion == "success"            -> success
    - conclusion in failure set          -> failure
    - anything else (queued/in_progress/neutral/skipped/cancelled/None) -> pending

    Empty input -> state "unknown" so the UI renders a neutral badge.
    """
    failure_conclusions = {
        "failure",
        "timed_out",
        "action_required",
        "stale",
    }
    total = len(check_runs)
    if total == 0:
        return {
            "state": "unknown",
            "total": 0,
            "success": 0,
            "failure": 0,
            "pending": 0,
            "checks": [],
        }

    checks: list[dict[str, Any]] = []
    success = failure = pending = 0
    for run in check_runs:
        name = run.get("name", "check")
        status = run.get("status", "completed")
        conclusion = run.get("conclusion")
        if status != "completed":
            bucket = "pending"
            pending += 1
        elif conclusion == "success":
            bucket = "success"
            success += 1
        elif conclusion in failure_conclusions:
            bucket = "failure"
            failure += 1
        else:
            # neutral / skipped / cancelled / None -> treat as pending, not red
            bucket = "pending"
            pending += 1
        checks.append(
            {
                "name": name,
                "status": status,
                "conclusion": conclusion,
                "bucket": bucket,
                "started_at": run.get("started_at"),
                "completed_at": run.get("completed_at"),
                "html_url": run.get("html_url") or run.get("details_url"),
            }
        )

    if failure > 0:
        state = "failure"
    elif pending > 0:
        state = "pending"
    else:
        state = "success"
    return {
        "state": state,
        "total": total,
        "success": success,
        "failure": failure,
        "pending": pending,
        "checks": checks,
    }


async def _get_json(
    client: httpx.AsyncClient, url: str, token: str | None
) -> dict[str, Any] | None:
    try:
        resp = await client.get(url, headers=_headers(token), timeout=_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            return data if isinstance(data, dict) else None
        logger.warning(f"GitHub API {resp.status_code} for {url}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Error fetching {url}: {e!s}")
    return None


# Tokens too generic to prove a CI check relates to a file. Without this
# stop-list, e.g. "test" would substring-match "latest/models.py".
_NOISE_TOKENS = frozenset(
    {
        "test", "tests", "testing", "ci", "build", "lint", "check", "checks",
        "run", "runs", "github", "actions", "workflow", "workflows", "job",
        "jobs", "main", "app", "src", "lib", "pr", "pull", "request",
    }
)


def _norm_tokens(text: str) -> set[str]:
    return {
        t
        for t in re.split(r"[^a-z0-9]+", (text or "").lower())
        if len(t) >= 4 and t not in _NOISE_TOKENS
    }


def _file_tokens(file_path: str) -> set[str]:
    parts = (file_path or "").replace("\\", "/").split("/")
    tokens: set[str] = set()
    for part in parts:
        name = part.rsplit(".", 1)[0]  # strip extension: test_auth.py -> test_auth
        tokens.update(_norm_tokens(part))
        tokens.update(_norm_tokens(name))
    return tokens


def correlate_ci_with_blast_radius(
    checks: list[dict[str, Any]],
    impacted_files: list[dict[str, Any]],
) -> dict[str, Any]:
    """Match FAILING checks against predicted blast-radius files.

    Deterministic token overlap (no LLM): a failing check named e.g.
    "pytest-auth" matches impacted file "auth/guard.py" via the "auth" token.
    Returns verdict "clean" (no failures) | "in_scope" (overlap) | "unrelated".
    """
    failing = [c for c in (checks or []) if c.get("bucket") == "failure"]
    if not failing:
        return {"verdict": "clean", "in_blast_radius": [], "unrelated": []}

    file_token_map = [
        (f.get("file_path", ""), _file_tokens(f.get("file_path", "")))
        for f in (impacted_files or [])
    ]

    in_scope: list[dict[str, Any]] = []
    unrelated: list[str] = []
    for check in failing:
        name = check.get("name", "check")
        check_tokens = _norm_tokens(name)
        matched = sorted(
            {
                path
                for path, ftokens in file_token_map
                if path and (check_tokens & ftokens)
            }
        )
        if matched:
            in_scope.append({"check_name": name, "matched_files": matched})
        else:
            unrelated.append(name)

    verdict = "in_scope" if in_scope else "unrelated"
    return {"verdict": verdict, "in_blast_radius": in_scope, "unrelated": unrelated}


def build_ci_context(
    summary: dict[str, Any],
    impacted_files: list[dict[str, Any]] | None = None,
) -> str:
    """Render a compact CI block for the AI review prompt."""
    state = summary.get("state", "unknown")
    if state == "unknown":
        return (
            "CI status unknown — no check runs reported for this PR head. "
            "Do not assume CI state; review the diff on its own merits."
        )
    total = summary.get("total", 0)
    lines = [
        "CI status for this PR"
        + (f" (head {summary['head_sha']})" if summary.get("head_sha") else "")
        + f": {state.upper()} — "
        + f"{summary.get('success', 0)} passed, "
        + f"{summary.get('failure', 0)} failed, "
        + f"{summary.get('pending', 0)} pending out of {total} checks."
    ]
    if state == "success":
        return " ".join(lines)

    failing_names = [
        c.get("name", "check")
        for c in summary.get("checks", [])
        if c.get("bucket") == "failure"
    ]
    if failing_names:
        lines.append(f"Failing checks: {', '.join(failing_names)}.")
    if impacted_files:
        corr = correlate_ci_with_blast_radius(
            summary.get("checks", []), impacted_files
        )
        for item in corr["in_blast_radius"]:
            lines.append(
                f"- {item['check_name']} touches predicted blast-radius "
                f"files: {', '.join(item['matched_files'])}. "
                "Treat related findings as high severity."
            )
    if state == "failure":
        lines.append(
            "Do not present this PR as safe to merge while CI is red; "
            "reference the failing checks in the summary."
        )
    return " ".join(lines)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def summarize_workflow_runs(runs: list[dict[str, Any]]) -> dict[str, Any]:
    """Collapse raw workflow-run payloads into dashboard stats.

    Pure function (no I/O): success rate + avg duration over completed runs,
    per-workflow breakdown, and a normalized recent-runs list.
    """
    normalized: list[dict[str, Any]] = []
    completed = 0
    succeeded = 0
    failed = 0
    durations: list[float] = []
    by_workflow: dict[str, dict[str, int]] = {}

    for run in runs or []:
        name = run.get("name", "workflow")
        status = run.get("status", "completed")
        conclusion = run.get("conclusion")
        created = _parse_dt(run.get("created_at"))
        updated = _parse_dt(run.get("updated_at"))
        duration_s: float | None = None
        if created and updated:
            duration_s = max(0.0, (updated - created).total_seconds())

        bucket = "pending"
        if status == "completed":
            completed += 1
            if conclusion == "success":
                bucket = "success"
                succeeded += 1
            elif conclusion in ("failure", "timed_out", "action_required", "stale"):
                bucket = "failure"
                failed += 1
            if duration_s is not None:
                durations.append(duration_s)

        entry = by_workflow.setdefault(name, {"total": 0, "success": 0, "failure": 0})
        entry["total"] += 1
        if bucket == "success":
            entry["success"] += 1
        elif bucket == "failure":
            entry["failure"] += 1

        actor = run.get("actor") or {}
        normalized.append(
            {
                "id": run.get("id"),
                "name": name,
                "branch": run.get("head_branch"),
                "event": run.get("event"),
                "status": status,
                "conclusion": conclusion,
                "bucket": bucket,
                "duration_s": round(duration_s) if duration_s is not None else None,
                "created_at": run.get("created_at"),
                "actor": actor.get("login"),
                "html_url": run.get("html_url"),
            }
        )

    success_rate = round(100.0 * succeeded / completed) if completed else None
    avg_duration_s = round(sum(durations) / len(durations)) if durations else None
    reliability, streaks = analyze_reliability(normalized)
    for name, streak_info in streaks.items():
        if name in by_workflow:
            by_workflow[name].update(streak_info)
    return {
        "total": len(normalized),
        "completed": completed,
        "success": succeeded,
        "failure": failed,
        "pending": len(normalized) - completed,
        "success_rate": success_rate,
        "avg_duration_s": avg_duration_s,
        "by_workflow": by_workflow,
        "reliability": reliability,
        "runs": normalized,
    }


def analyze_reliability(
    normalized_runs: list[dict[str, Any]],
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    """Flaky-workflow detection, MTTR, and per-workflow streaks.

    Pure function over normalized runs (see summarize_workflow_runs).
    - A "recovery episode" opens on a failed run and closes on the next
      successful run of the same workflow; a workflow with >= 1 closed
      episode is flagged flaky (failed, then passed on a later run).
    - MTTR is the mean failure-to-recovery time over closed episodes.
    - Streaks count consecutive same-bucket completed runs, newest first.
    """
    by_name: dict[str, list[dict[str, Any]]] = {}
    for run in normalized_runs or []:
        by_name.setdefault(run.get("name", "workflow"), []).append(run)

    recovery_durations: list[float] = []
    recovered_episodes = 0
    flaky_workflows: list[dict[str, Any]] = []
    open_failures: list[str] = []
    streaks: dict[str, dict[str, Any]] = {}

    for name, runs in by_name.items():
        ordered = sorted(runs, key=lambda r: r.get("created_at") or "")
        # Recovery episodes (oldest -> newest)
        episode_start: datetime | None = None
        recoveries = 0
        for run in ordered:
            bucket = run.get("bucket")
            if bucket == "failure" and episode_start is None:
                episode_start = _parse_dt(run.get("created_at"))
            elif bucket == "success" and episode_start is not None:
                recovered = _parse_dt(run.get("created_at"))
                if episode_start and recovered:
                    recovery_durations.append(
                        max(0.0, (recovered - episode_start).total_seconds())
                    )
                recovered_episodes += 1
                recoveries += 1
                episode_start = None
        if recoveries:
            flaky_workflows.append({"name": name, "recoveries": recoveries})

        # Completed runs newest-first for streak + trailing rate
        completed_runs = [
            r for r in sorted(ordered, key=lambda r: r.get("created_at") or "", reverse=True)
            if r.get("bucket") in ("success", "failure")
        ]
        streak = 0
        streak_type: str | None = None
        for run in completed_runs:
            bucket = run.get("bucket")
            kind = "passing" if bucket == "success" else "failing"
            if streak_type is None:
                streak_type = kind
                streak = 1
            elif kind == streak_type:
                streak += 1
            else:
                break
        window = completed_runs[:10]
        last_rate = (
            round(100.0 * sum(1 for r in window if r.get("bucket") == "success") / len(window))
            if window
            else None
        )
        streaks[name] = {
            "streak": streak,
            "streak_type": streak_type,
            "last_rate": last_rate,
        }
        if streak_type == "failing":
            open_failures.append(name)

    flaky_workflows.sort(key=lambda f: f["recoveries"], reverse=True)
    mttr_s = round(sum(recovery_durations) / len(recovery_durations)) if recovery_durations else None
    reliability = {
        "mttr_s": mttr_s,
        "recovered_episodes": recovered_episodes,
        "open_failures": sorted(open_failures),
        "flaky_workflows": flaky_workflows,
    }
    return reliability, streaks


async def fetch_repo_actions(
    full_name: str, token: str | None, per_page: int = 20
) -> dict[str, Any]:
    """Fetch recent workflow runs for a repo. Never raises."""
    if not full_name or "/" not in full_name:
        return summarize_workflow_runs([])
    try:
        async with httpx.AsyncClient() as client:
            data = await _get_json(
                client,
                f"{API_ROOT}/repos/{full_name}/actions/runs?per_page={per_page}",
                token,
            )
            runs = (data or {}).get("workflow_runs", []) or []
            return summarize_workflow_runs(runs)
    except Exception as e:
        logger.warning(f"fetch_repo_actions failed for {full_name}: {e!s}")
        return summarize_workflow_runs([])


async def fetch_pr_checks(
    full_name: str, pr_number: int, token: str | None
) -> dict[str, Any]:
    """Fetch CI summary for a PR.

    1. GET /repos/{full}/pulls/{number} -> head SHA
    2. In parallel: GET check-runs for SHA + GET combined status for ref
    Returns the normalized summary dict; never raises.
    """
    if not full_name or "/" not in full_name:
        return summarize_checks([])

    try:
        async with httpx.AsyncClient() as client:
            pr = await _get_json(
                client, f"{API_ROOT}/repos/{full_name}/pulls/{pr_number}", token
            )
            if not pr:
                return summarize_checks([])
            head = (pr.get("head") or {}).get("sha", "")
            if not head:
                return summarize_checks([])

            check_runs_url = (
                f"{API_ROOT}/repos/{full_name}/commits/{head}/check-runs?per_page=50"
            )
            combined_url = (
                f"{API_ROOT}/repos/{full_name}/commits/{head}/check-suites"
                f"?per_page=1"
            )
            # Primary: check-runs. Secondary (best-effort): combined commit status.
            check_data, _ = await asyncio.gather(
                _get_json(client, check_runs_url, token),
                _get_json(client, combined_url, token),
            )
            runs = []
            if check_data:
                runs = check_data.get("check_runs", []) or []
            summary = summarize_checks(runs)
            summary["head_sha"] = head[:7] if head else None
            return summary
    except Exception as e:
        logger.warning(f"fetch_pr_checks failed for {full_name}#{pr_number}: {e!s}")
        return summarize_checks([])
