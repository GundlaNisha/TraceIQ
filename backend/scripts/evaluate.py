import argparse
import asyncio
import os

from github import Github
from sqlalchemy import select

from app.ai.router.dispatcher import dispatch_impact_analysis
from app.db.session import AsyncSessionLocal
from app.modules.repository.models.repo import Repository
from app.modules.retrieval.services.semantic import semantic_search


async def run_evaluation(repo_id: str, github_repo_name: str, limit: int = 10):
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("Please set GITHUB_TOKEN environment variable.")
        return

    g = Github(token)
    try:
        repo = g.get_repo(github_repo_name)
    except Exception as e:
        print(f"Error fetching repository {github_repo_name}: {e}")
        return

    # Fetch recently merged PRs
    pulls = repo.get_pulls(state="closed", sort="updated", direction="desc")

    merged_prs = []
    for pr in pulls:
        if pr.merged and pr.body:
            merged_prs.append(pr)
            if len(merged_prs) >= limit:
                break

    if not merged_prs:
        print("No merged PRs with descriptions found.")
        return

    print(f"Found {len(merged_prs)} merged PRs for evaluation.")

    total_precision = 0.0
    total_recall = 0.0
    valid_evals = 0

    async with AsyncSessionLocal() as session:
        # Check repo exists
        stmt = select(Repository).where(Repository.id == repo_id)
        result = await session.execute(stmt)
        repository = result.scalar_one_or_none()

        if not repository:
            print(f"Repository {repo_id} not found in database.")
            return

        for pr in merged_prs:
            print(f"\nEvaluating PR #{pr.number}: {pr.title}")
            requirement = pr.body

            actual_files = {f.filename for f in pr.get_files()}

            # 1. Semantic search
            search_results = await semantic_search(
                session, requirement, repository.id, top_k=15
            )
            chunks = [
                {"file_path": item["file_path"], "chunk_text": item["snippet"]}
                for item in search_results
            ]

            if not chunks:
                print("  No chunks found in semantic search. Skipping PR.")
                continue

            # 2. Dispatch
            ai_result = await dispatch_impact_analysis(requirement, chunks)

            suggested_files = {f.file_path for f in ai_result.impacted_files}

            print(f"  Actual files ({len(actual_files)}): {actual_files}")
            print(f"  Suggested files ({len(suggested_files)}): {suggested_files}")

            # 3. Calculate metrics
            true_positives = len(actual_files.intersection(suggested_files))

            precision = (
                true_positives / len(suggested_files) if suggested_files else 0.0
            )
            recall = true_positives / len(actual_files) if actual_files else 0.0

            print(f"  Precision: {precision:.2f} | Recall: {recall:.2f}")

            total_precision += precision
            total_recall += recall
            valid_evals += 1

    if valid_evals > 0:
        avg_precision = total_precision / valid_evals
        avg_recall = total_recall / valid_evals
        print(f"\n=== Final Results ({valid_evals} PRs) ===")
        print(f"Average Precision: {avg_precision:.2f}")
        print(f"Average Recall:    {avg_recall:.2f}")
    else:
        print("\nNo valid evaluations could be computed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Evaluate Impact Engine using Historical PRs"
    )
    parser.add_argument(
        "--repo-id",
        type=str,
        required=True,
        help="UUID of the repository in the local DB",
    )
    parser.add_argument(
        "--github-repo",
        type=str,
        required=True,
        help="GitHub repo name, e.g. 'owner/repo'",
    )
    parser.add_argument(
        "--limit", type=int, default=10, help="Number of PRs to evaluate"
    )

    args = parser.parse_args()
    asyncio.run(run_evaluation(args.repo_id, args.github_repo, args.limit))
