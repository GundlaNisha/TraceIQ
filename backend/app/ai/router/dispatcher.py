from typing import cast

from app.ai.context.builder import build_graph_augmented_context
from app.ai.parsers.schemas import (
    ImpactAnalysisOutput,
    PRReviewOutput,
)
from app.ai.prompts import impact as impact_prompts
from app.ai.prompts import pr_review as pr_review_prompts
from app.ai.providers.openai_adapter import LiteLLMAdapter

_adapter = LiteLLMAdapter()


async def dispatch_impact_analysis(
    requirement_text: str,
    chunks: list[dict],
    dependencies: list[dict] | None = None,
) -> ImpactAnalysisOutput:
    context = build_graph_augmented_context(chunks, dependencies)
    system = impact_prompts.IMPACT_SYSTEM
    user = impact_prompts.build_impact_prompt(requirement_text, context)
    return cast(
        ImpactAnalysisOutput,
        await _adapter.complete(system, user, ImpactAnalysisOutput),
    )


async def dispatch_pr_review(
    pr_title: str,
    pr_diff: str,
    requirement_text: str = "",
    analysis_context: str = "",
) -> PRReviewOutput:
    system = pr_review_prompts.PR_REVIEW_SYSTEM
    user = pr_review_prompts.build_pr_review_prompt(
        pr_title, pr_diff, requirement_text, analysis_context
    )
    return cast(PRReviewOutput, await _adapter.complete(system, user, PRReviewOutput))
