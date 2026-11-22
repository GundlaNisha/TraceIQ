import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.impact.models.impact import ImpactResult
from app.modules.impact.services.auto_blast_radius import ensure_pr_blast_radius
from app.modules.indexing.models.index_models import CodeDependency
from app.modules.repository.models.repo import Repository
from app.modules.requirement.models.req import Requirement


@pytest.mark.asyncio
async def test_ensure_pr_blast_radius_existing_job():
    repo = Repository(
        id=uuid.uuid4(),
        user_id="user_test_a",
        name="test/repo",
        repo_url="https://github.com/test/repo",
    )
    req = Requirement(
        id=uuid.uuid4(),
        user_id="user_test_a",
        repository_id=repo.id,
        title="Resume Auto Save",
        text="Auto save draft resume",
    )

    mock_impact = ImpactResult(
        id=uuid.uuid4(),
        job_id=uuid.uuid4(),
        impacted_files={
            "files": [
                {
                    "file_path": "src/store/resumeSlice.ts",
                    "confidence": 0.95,
                    "risk_level": "high",
                    "reasoning": "State management",
                }
            ]
        },
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_impact
    mock_db.execute.return_value = mock_result

    analysis_context, impacted_paths = await ensure_pr_blast_radius(
        db=mock_db,
        repository=repo,
        requirement=req,
        file_patches=[{"file_path": "src/store/resumeSlice.ts", "patch": "..."}],
    )

    assert "src/store/resumeSlice.ts" in analysis_context
    assert len(impacted_paths) == 1
    assert impacted_paths[0]["file_path"] == "src/store/resumeSlice.ts"


@pytest.mark.asyncio
async def test_ensure_pr_blast_radius_computes_graph_hops():
    repo = Repository(
        id=uuid.uuid4(),
        user_id="user_test_a",
        name="test/repo",
        repo_url="https://github.com/test/repo",
    )
    req = Requirement(
        id=uuid.uuid4(),
        user_id="user_test_a",
        repository_id=repo.id,
        title="Resume Auto Save",
        text="Auto save draft resume",
    )

    file_patches = [
        {"file_path": "src/store/resumeSlice.ts", "patch": "@@ -1 +1 @@\n+// code"},
    ]

    dep1 = CodeDependency(
        id=uuid.uuid4(),
        repository_id=repo.id,
        source_file="src/components/ResumePreview.tsx",
        target_file="src/store/resumeSlice.ts",
    )

    dep2 = CodeDependency(
        id=uuid.uuid4(),
        repository_id=repo.id,
        source_file="src/pages/BuilderPage.tsx",
        target_file="src/components/ResumePreview.tsx",
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()

    # Call 1: Check existing AnalysisJob -> None
    res1 = MagicMock()
    res1.scalar_one_or_none.return_value = None

    # Call 2: Hop 1 dependencies
    res2 = MagicMock()
    scalars2 = MagicMock()
    scalars2.all.return_value = [dep1]
    res2.scalars.return_value = scalars2

    # Call 3: Hop 2 dependencies
    res3 = MagicMock()
    scalars3 = MagicMock()
    scalars3.all.return_value = [dep2]
    res3.scalars.return_value = scalars3

    mock_db.execute.side_effect = [res1, res2, res3]

    analysis_context, impacted_paths = await ensure_pr_blast_radius(
        db=mock_db,
        repository=repo,
        requirement=req,
        file_patches=file_patches,
    )

    # Verifies all 3 tiers are present: Seed (Direct PR), Hop 1, Hop 2
    paths = [p["file_path"] for p in impacted_paths]
    assert "src/store/resumeSlice.ts" in paths
    assert "src/components/ResumePreview.tsx" in paths
    assert "src/pages/BuilderPage.tsx" in paths

    assert "Autonomous AST Blast Radius" in analysis_context
    assert mock_db.commit.awaited
