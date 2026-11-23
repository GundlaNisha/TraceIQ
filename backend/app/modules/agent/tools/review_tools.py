import os
import re
import uuid
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.modules.indexing.models.index_models import RepositoryFile

_EXCLUDED_EXTENSIONS = {
    # Web & static assets
    ".html", ".htm", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf", ".eot",
    # Stylesheets
    ".css", ".scss", ".sass", ".less", ".styl",
    # Schemas, migrations & queries
    ".prisma", ".sql", ".graphql", ".gql", ".proto",
    # Config, markup & data
    ".json", ".yaml", ".yml", ".toml", ".xml", ".ini", ".cfg", ".cnf", ".conf", ".env", ".lock", ".lockb",
    # Documentation & text
    ".md", ".markdown", ".rst", ".txt", ".csv", ".tsv",
}

_EXCLUDED_FILENAMES = {
    "dockerfile", "docker-compose.yml", "docker-compose.yaml",
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
    "tsconfig.json", "tsconfig.node.json", "jsconfig.json",
    "alembic.ini", "pytest.ini", "pyproject.toml", "poetry.lock", "uv.lock", "requirements.txt",
    "license", "license.md", "license.txt", "readme", "readme.md",
}


def _is_test_file_path(file_path: str) -> bool:
    """Check if a file path is already part of a test suite."""
    p_lower = file_path.lower()
    parts = p_lower.split("/")
    filename = parts[-1]

    if any(p in ("tests", "test", "__tests__", "spec", "specs", "e2e", "cypress") for p in parts[:-1]):
        return True
    if filename.startswith("test_") or filename.endswith(("_test.py", "_test.go", "_test.rs")):
        return True
    if any(filename.endswith(f".{t}.{ext}") for t in ("test", "spec") for ext in ("ts", "tsx", "js", "jsx")):
        return True
    return False


def _is_testable_code_file(file_path: str) -> bool:
    """Determine whether a modified file should have associated unit test coverage."""
    p_lower = file_path.lower()
    parts = p_lower.split("/")
    filename = parts[-1]
    name_no_ext, ext = os.path.splitext(filename)

    # Exclude directories that should not be unit-tested
    if any(p in ("migrations", "alembic", "generated", "dist", "build", ".next", ".git", "vendor", "node_modules") for p in parts):
        return False

    # Exclude search engine or domain verification files (e.g. google125d201a20233e56.html)
    if filename.startswith("google") and ext in (".html", ".htm"):
        return False
    if filename in ("robots.txt", "sitemap.xml", "favicon.ico"):
        return False

    # Exclude exact filenames and config extensions
    if filename in _EXCLUDED_FILENAMES or name_no_ext in _EXCLUDED_FILENAMES:
        return False
    if ext in _EXCLUDED_EXTENSIONS or filename.startswith(".env"):
        return False

    # Exclude if it's already a test file
    if _is_test_file_path(file_path):
        return False

    # Exclude TypeScript declaration files
    if filename.endswith(".d.ts"):
        return False

    # Only include recognized programming languages
    code_extensions = {
        ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
        ".go", ".rs", ".java", ".kt", ".c", ".cpp", ".cc", ".h", ".hpp",
        ".cs", ".rb", ".php", ".swift",
    }
    return ext in code_extensions


def _generate_test_recommendation(file_path: str) -> str:
    """Generates an accurate, language-tailored test creation recommendation."""
    filename = file_path.split("/")[-1]
    name_no_ext, ext = os.path.splitext(filename)
    parts = file_path.split("/")
    parent_dir = parts[-2] if len(parts) > 1 else ""

    if ext == ".py":
        return f"Create test_{name_no_ext}.py or tests/test_{name_no_ext}.py covering newly modified logic paths."
    elif ext in (".tsx", ".jsx"):
        if name_no_ext in ("page", "index", "layout", "view") and parent_dir:
            return f"Create {parent_dir}.test{ext} or {name_no_ext}.test{ext} covering component renders and user interactions."
        return f"Create {name_no_ext}.test{ext} covering component renders and user interactions."
    elif ext in (".ts", ".js", ".mjs"):
        if name_no_ext in ("route", "index") and parent_dir:
            return f"Create {parent_dir}.test{ext} or {name_no_ext}.test{ext} covering API endpoints or logic paths."
        return f"Create {name_no_ext}.test{ext} or __tests__/{name_no_ext}.test{ext} covering newly modified logic paths."
    elif ext == ".go":
        return f"Create {name_no_ext}_test.go covering modified functions."
    elif ext == ".rs":
        return f"Add unit test suite in {name_no_ext}.rs or tests/{name_no_ext}_test.rs."
    elif ext in (".java", ".kt"):
        return f"Create {name_no_ext}Test{ext} covering modified public methods."
    else:
        return f"Create unit test file for {filename} covering newly modified logic paths."


def audit_diff_standards_fn(diff_text: str) -> dict[str, Any]:
    """Audit code changes or diff text against coding standards, security, and quality rules."""
    findings: list[dict[str, Any]] = []

    lines = diff_text.splitlines()
    current_file: str | None = None
    for idx, line in enumerate(lines, 1):
        m = re.match(r"^\+\+\+\s+b/(.+)$", line.strip())
        if m:
            current_file = m.group(1).strip()
            continue
        clean_line = line.lstrip("+-").strip()
        # 1. Hardcoded API keys / Secrets
        if re.search(r"(?:api_key|secret|password|token)\s*=\s*['\"][A-Za-z0-9_\-]{8,}['\"]", clean_line, re.IGNORECASE):
            findings.append({
                "severity": "high",
                "category": "security",
                "rule": "no-hardcoded-secrets",
                "line": idx,
                "file": current_file,
                "message": "Potential hardcoded secret or token detected. Use environment variables or secret manager.",
                "snippet": line.strip()[:100],
            })

        # 2. Raw SQL string concatenation (SQL injection risk)
        if re.search(r"(?:SELECT|INSERT|UPDATE|DELETE).*\+", clean_line, re.IGNORECASE) or re.search(r"execute\s*\(\s*f['\"].*\{.*\}", clean_line):
            findings.append({
                "severity": "high",
                "category": "security",
                "rule": "sql-injection-risk",
                "line": idx,
                "file": current_file,
                "message": "Dynamic SQL construction using string formatting detected. Use parameterized queries.",
                "snippet": line.strip()[:100],
            })

        # 3. Bare except clauses
        if re.search(r"^except\s*:\s*$", clean_line):
            findings.append({
                "severity": "medium",
                "category": "error-handling",
                "rule": "no-bare-except",
                "line": idx,
                "file": current_file,
                "message": "Bare 'except:' catches SystemExit and KeyboardInterrupt. Catch specific exceptions instead.",
                "snippet": line.strip(),
            })

        # 4. Print / console.log debugging left in code
        if re.search(r"^(?:print\(|console\.log\()", clean_line):
            findings.append({
                "severity": "low",
                "category": "code-style",
                "rule": "no-debug-logs",
                "line": idx,
                "file": current_file,
                "message": "Direct console logging detected in production path. Use standard logging framework.",
                "snippet": line.strip()[:80],
            })

        # 5. TODO / FIXME markers
        if re.search(r"\b(?:TODO|FIXME|HACK)\b", clean_line):
            findings.append({
                "severity": "low",
                "category": "code-quality",
                "rule": "pending-todo",
                "line": idx,
                "file": current_file,
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
    repository_id: str | None,
    modified_files: list[str],
    modified_symbols: list[str] | None = None,
    db: AsyncSession | None = None,
) -> dict[str, Any]:
    """Scan existing repository test files to identify missing unit test coverage for changed code."""
    if not repository_id:
        return {"total_modified_files": len(modified_files), "test_files_detected_in_repo": 0, "missing_coverage_count": 0, "missing_coverage": [], "test_gap_detected": False}

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

    if db is None:
        async with AsyncSessionLocal() as session:
            result = await session.execute(stmt)
            test_files = [r[0] for r in result.all()]
    else:
        result = await db.execute(stmt)
        test_files = [r[0] for r in result.all()]

    # Filter modified files for testable business logic code only
    testable_files = [f for f in modified_files if _is_testable_code_file(f)]

    missing_coverage: list[dict[str, Any]] = []

    for file_path in testable_files:
        filename = file_path.split("/")[-1]
        name_no_ext, ext = os.path.splitext(filename)
        parts = file_path.split("/")
        parent_dir = parts[-2] if len(parts) > 1 else ""

        has_matching_test = False
        for tf in test_files:
            tf_lower = tf.lower()
            tf_file = tf.split("/")[-1].lower()
            if name_no_ext.lower() in tf_file:
                if name_no_ext.lower() not in ("page", "index", "route", "layout", "main", "types"):
                    has_matching_test = True
                    break
                elif parent_dir and parent_dir.lower() in tf_lower:
                    has_matching_test = True
                    break
            if parent_dir and len(parent_dir) > 2 and (f"{parent_dir.lower()}.test" in tf_file or f"{parent_dir.lower()}_test" in tf_file):
                has_matching_test = True
                break

        if not has_matching_test:
            missing_coverage.append({
                "file_path": file_path,
                "status": "missing_test_file",
                "recommendation": _generate_test_recommendation(file_path),
            })

    return {
        "total_modified_files": len(modified_files),
        "testable_files_count": len(testable_files),
        "test_files_detected_in_repo": len(test_files),
        "missing_coverage_count": len(missing_coverage),
        "missing_coverage": missing_coverage,
        "test_gap_detected": len(missing_coverage) > 0,
    }
