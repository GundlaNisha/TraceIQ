import re
import uuid
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.indexing.models.index_models import RepositoryFile


def audit_diff_standards_fn(diff_text: str) -> dict[str, Any]:
    """Audit code changes or diff text against coding standards, security, and quality rules."""
    findings: list[dict[str, Any]] = []

    lines = diff_text.splitlines()
    for idx, line in enumerate(lines, 1):
        # 1. Hardcoded API keys / Secrets
        if re.search(r"(?:api_key|secret|password|token)\s*=\s*['\"][A-Za-z0-9_\-]{8,}['\"]", line, re.IGNORECASE):
            findings.append({
                "severity": "high",
                "category": "security",
                "rule": "no-hardcoded-secrets",
                "line": idx,
                "message": "Potential hardcoded secret or token detected. Use environment variables or secret manager.",
                "snippet": line.strip()[:100],
            })

        # 2. Raw SQL string concatenation (SQL injection risk)
        if re.search(r"(?:SELECT|INSERT|UPDATE|DELETE).*\+.*(?:['\"])", line, re.IGNORECASE) or re.search(r"execute\s*\(\s*f['\"].*\{.*\}", line):
            findings.append({
                "severity": "high",
                "category": "security",
                "rule": "sql-injection-risk",
                "line": idx,
                "message": "Dynamic SQL construction using string formatting detected. Use parameterized queries.",
                "snippet": line.strip()[:100],
            })

        # 3. Bare except clauses
        if re.search(r"^\s*except\s*:\s*$", line):
            findings.append({
                "severity": "medium",
                "category": "error-handling",
                "rule": "no-bare-except",
                "line": idx,
                "message": "Bare 'except:' catches SystemExit and KeyboardInterrupt. Catch specific exceptions instead.",
                "snippet": line.strip(),
            })

        # 4. Print / console.log debugging left in code
        if re.search(r"^\s*(?:print\(|console\.log\()", line):
            findings.append({
                "severity": "low",
                "category": "code-style",
                "rule": "no-debug-logs",
                "line": idx,
                "message": "Direct console logging detected in production path. Use standard logging framework.",
                "snippet": line.strip()[:80],
            })

        # 5. TODO / FIXME markers
        if re.search(r"\b(?:TODO|FIXME|HACK)\b", line):
            findings.append({
                "severity": "low",
                "category": "code-quality",
                "rule": "pending-todo",
                "line": idx,
                "message": "Unresolved TODO or FIXME comment in modified line.",
                "snippet": line.strip()[:80],
            })

    # Summary calculation
    counts = {"high": 0, "medium": 0, "low": 0}
    for f in findings:
        counts[f["severity"]] += 1

    return {
        "total_findings": len(findings),
        "high_severity_count": counts["high"],
        "medium_severity_count": counts["medium"],
        "low_severity_count": counts["low"],
        "findings": findings[:20],
        "passed": counts["high"] == 0,
    }


async def audit_missing_tests_fn(
    db: AsyncSession,
    repository_id: str,
    modified_files: list[str],
    modified_symbols: list[str] | None = None,
) -> dict[str, Any]:
    """Scan existing repository test files to identify missing unit test coverage for changed code."""
    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        return {"error": "Invalid repository ID"}

    # Fetch all test files in repository
    stmt = (
        select(RepositoryFile.file_path)
        .where(RepositoryFile.repository_id == repo_uuid)
        .where(
            or_(
                RepositoryFile.file_path.ilike("%test%"),
                RepositoryFile.file_path.ilike("%spec%"),
            )
        )
    )
    result = await db.execute(stmt)
    test_files = [r[0] for r in result.all()]

    missing_coverage: list[dict[str, Any]] = []

    for file_path in modified_files:
        # Check if file has a corresponding test
        base_name = file_path.split("/")[-1].split(".")[0]
        has_matching_test = any(
            base_name in tf.split("/")[-1] for tf in test_files
        )

        if not has_matching_test:
            missing_coverage.append({
                "file_path": file_path,
                "status": "missing_test_file",
                "recommendation": f"Create test_{base_name}.py or {base_name}.test.ts covering newly modified logic paths.",
            })

    return {
        "total_modified_files": len(modified_files),
        "test_files_detected_in_repo": len(test_files),
        "missing_coverage_count": len(missing_coverage),
        "missing_coverage": missing_coverage,
        "test_gap_detected": len(missing_coverage) > 0,
    }
