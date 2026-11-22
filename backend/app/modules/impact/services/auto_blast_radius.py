"""
Autonomous 2-Hop AST Blast Radius Service.

Computes or retrieves the impacted files and blast radius for a Pull Request
by traversing the code dependency graph (CodeDependency) starting from PR unified diff modified files.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.impact.models.impact import AnalysisJob, ImpactResult, JobStatus
from app.modules.indexing.models.index_models import CodeDependency
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement

logger = logging.getLogger(__name__)


async def ensure_pr_blast_radius(
    db: AsyncSession,
    repository: Repository,
    requirement: Requirement,
    file_patches: list[dict[str, Any]],
) -> tuple[str, list[dict[str, str]]]:
    """
    Ensures that an impact analysis / blast radius exists for this PR.

    1. If a completed AnalysisJob and ImpactResult already exist for (requirement.id, repository.id),
       returns the existing analysis context and impacted paths.
    2. Otherwise, calculates the deterministic 2-hop blast radius using the PR modified files as seeds:
       - Seed files (confidence: 1.0, risk: high, "Directly modified in PR diff")
       - 1-hop dependencies / callers (confidence: 0.85, risk: medium, "Direct AST caller / dependency")
       - 2-hop dependencies (confidence: 0.65, risk: low, "Transitive AST graph dependency")
    3. Persists an AnalysisJob (completed, 100%) and ImpactResult to the database.
    4. Returns (analysis_context, impacted_paths).
    """
    # 1. Check for existing completed AnalysisJob and ImpactResult
    stmt = (
        select(ImpactResult)
        .join(AnalysisJob, ImpactResult.job_id == AnalysisJob.id)
        .where(
            AnalysisJob.requirement_id == requirement.id,
            AnalysisJob.repository_id == repository.id,
            AnalysisJob.status == JobStatus.completed,
        )
        .order_by(AnalysisJob.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    existing_impact = result.scalar_one_or_none()

    if existing_impact and existing_impact.impacted_files:
        files_data = existing_impact.impacted_files.get("files", [])
        if files_data:
            logger.info(
                f"Using existing blast radius with {len(files_data)} files for req {requirement.id} in repo {repository.id}"
            )
            impacted_paths = [
                {"file_path": f.get("file_path", "")}
                for f in files_data
                if f.get("file_path")
            ]
            file_lines = [
                f"- {f.get('file_path')} (confidence: {f.get('confidence', 1.0)}, risk: {f.get('risk_level', 'medium')}): {f.get('reasoning', '')}"
                for f in files_data
            ]
            analysis_context = (
                "Impacted files predicted by prior analysis:\n" + "\n".join(file_lines)
            )
            return analysis_context, impacted_paths

    # 2. Extract seed files directly modified by this PR
    seed_files = [
        p["file_path"].strip()
        for p in file_patches
        if p.get("file_path") and p.get("file_path") != "unknown"
    ]

    if not seed_files:
        logger.info(f"No seed files extracted from PR diff for repo {repository.id}")
        return "", []

    logger.info(
        f"Computing autonomous 2-hop AST blast radius for {len(seed_files)} PR files in repo {repository.id}"
    )

    hop1_dependencies: set[str] = set()
    hop2_dependencies: set[str] = set()

    try:
        # Hop 1: Direct callers / imports where source or target is in seed_files
        hop1_conditions = []
        for sf in seed_files[:30]:
            hop1_conditions.append(CodeDependency.source_file == sf)
            hop1_conditions.append(CodeDependency.target_file == sf)
            hop1_conditions.append(CodeDependency.source_file.ilike(f"%{sf}%"))
            hop1_conditions.append(CodeDependency.target_file.ilike(f"%{sf}%"))

        if hop1_conditions:
            hop1_stmt = (
                select(CodeDependency)
                .where(
                    CodeDependency.repository_id == repository.id,
                    or_(*hop1_conditions),
                )
                .limit(60)
            )
            hop1_res = await db.execute(hop1_stmt)
            for dep in hop1_res.scalars().all():
                if dep.source_file not in seed_files:
                    hop1_dependencies.add(dep.source_file)
                if dep.target_file not in seed_files:
                    hop1_dependencies.add(dep.target_file)

        # Hop 2: Transitive dependencies from Hop 1 nodes
        if hop1_dependencies:
            hop2_conditions = []
            for hf in list(hop1_dependencies)[:20]:
                hop2_conditions.append(CodeDependency.source_file == hf)
                hop2_conditions.append(CodeDependency.target_file == hf)

            if hop2_conditions:
                hop2_stmt = (
                    select(CodeDependency)
                    .where(
                        CodeDependency.repository_id == repository.id,
                        or_(*hop2_conditions),
                    )
                    .limit(60)
                )
                hop2_res = await db.execute(hop2_stmt)
                for dep in hop2_res.scalars().all():
                    if (
                        dep.source_file not in seed_files
                        and dep.source_file not in hop1_dependencies
                    ):
                        hop2_dependencies.add(dep.source_file)
                    if (
                        dep.target_file not in seed_files
                        and dep.target_file not in hop1_dependencies
                    ):
                        hop2_dependencies.add(dep.target_file)

    except Exception as graph_err:
        logger.warning(
            f"Code graph traversal encountered error (falling back to seeds): {graph_err!s}"
        )

    # 3. Build structured impacted files list
    impacted_list: list[dict[str, Any]] = []

    for sf in seed_files:
        impacted_list.append(
            {
                "file_path": sf,
                "confidence": 1.0,
                "risk_level": "high",
                "reasoning": "Directly modified in PR diff",
            }
        )

    for h1 in list(hop1_dependencies)[:15]:
        impacted_list.append(
            {
                "file_path": h1,
                "confidence": 0.85,
                "risk_level": "medium",
                "reasoning": "Direct caller / dependency in AST code graph",
            }
        )

    for h2 in list(hop2_dependencies)[:10]:
        impacted_list.append(
            {
                "file_path": h2,
                "confidence": 0.65,
                "risk_level": "low",
                "reasoning": "Transitive 2-hop dependency in AST code graph",
            }
        )

    # 4. Save AnalysisJob and ImpactResult to database for transparency and UI inspection
    try:
        job = AnalysisJob(
            user_id=repository.user_id,
            requirement_id=requirement.id,
            repository_id=repository.id,
            status=JobStatus.completed,
            progress=100,
        )
        db.add(job)
        await db.flush()

        impact_result = ImpactResult(
            job_id=job.id,
            impacted_files={"files": impacted_list},
        )
        db.add(impact_result)
        await db.commit()
        logger.info(
            f"Stored autonomous blast radius job {job.id} ({len(impacted_list)} files) for PR"
        )
    except Exception as db_err:
        await db.rollback()
        logger.warning(
            f"Could not persist autonomous AnalysisJob (non-fatal): {db_err!s}"
        )

    # 5. Format analysis_context and impacted_paths
    file_lines = [
        f"- {f['file_path']} (confidence: {f['confidence']}, risk: {f['risk_level']}): {f['reasoning']}"
        for f in impacted_list
    ]
    analysis_context = (
        "Autonomous AST Blast Radius (PR Diff + 2-Hop Graph):\n" + "\n".join(file_lines)
    )
    impacted_paths = [{"file_path": f["file_path"]} for f in impacted_list]

    return analysis_context, impacted_paths
