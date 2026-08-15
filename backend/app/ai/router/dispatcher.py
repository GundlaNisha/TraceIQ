from app.ai.context.builder import build_context
from app.ai.parsers.schemas import (
    CommitReviewOutput,
    ImpactAnalysisOutput,
    PRDraftOutput,
    PRReviewOutput,
)
from app.ai.prompts import impact as impact_prompts
from app.ai.prompts import pr_draft as pr_draft_prompts
from app.ai.prompts import pr_review as pr_review_prompts
from app.ai.prompts import review as review_prompts
from app.ai.providers.openai_adapter import LiteLLMAdapter

_adapter = LiteLLMAdapter()

from typing import cast


async def dispatch_impact_analysis(
    requirement_text: str, chunks: list[dict]
) -> ImpactAnalysisOutput:
    context = build_context(chunks)
    system = impact_prompts.IMPACT_SYSTEM
    user = impact_prompts.build_impact_prompt(requirement_text, context)
    return cast(
        ImpactAnalysisOutput,
        await _adapter.complete(system, user, ImpactAnalysisOutput),
    )


async def dispatch_commit_review(
    diff_text: str,
    requirement_text: str,
    chunks: list[dict],
    linter_output: str = "",
    missing_tests: list[str] | None = None,
) -> CommitReviewOutput:
    if missing_tests is None:
        missing_tests = []
    context = build_context(chunks)
    system = review_prompts.REVIEW_SYSTEM
    user = review_prompts.build_review_prompt(
        diff_text, requirement_text, context, linter_output, missing_tests
    )
    return cast(
        CommitReviewOutput, await _adapter.complete(system, user, CommitReviewOutput)
    )


async def dispatch_pr_generation(
    requirement_text: str, diff_summary: str, findings: list[dict]
) -> PRDraftOutput:
    system = pr_draft_prompts.PR_DRAFT_SYSTEM
    user = pr_draft_prompts.build_pr_draft_prompt(
        requirement_text, diff_summary, findings
    )
    return cast(PRDraftOutput, await _adapter.complete(system, user, PRDraftOutput))


async def dispatch_pr_review(
    pr_title: str, pr_diff: str, requirement_text: str = ""
) -> PRReviewOutput:
    system = pr_review_prompts.PR_REVIEW_SYSTEM
    user = pr_review_prompts.build_pr_review_prompt(pr_title, pr_diff, requirement_text)
    return cast(PRReviewOutput, await _adapter.complete(system, user, PRReviewOutput))
