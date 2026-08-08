from app.ai.providers.openai_adapter import LiteLLMAdapter
from app.ai.context.builder import build_context
from app.ai.prompts import impact as impact_prompts
from app.ai.prompts import review as review_prompts
from app.ai.prompts import pr_draft as pr_draft_prompts
from app.ai.parsers.schemas import ImpactAnalysisOutput, CommitReviewOutput, PRDraftOutput

_adapter = LiteLLMAdapter()

async def dispatch_impact_analysis(requirement_text: str, chunks: list[dict]) -> ImpactAnalysisOutput:
    context = build_context(chunks)
    system = impact_prompts.IMPACT_SYSTEM
    user = impact_prompts.build_impact_prompt(requirement_text, context)
    return await _adapter.complete(system, user, ImpactAnalysisOutput)

async def dispatch_commit_review(diff_text: str, requirement_text: str, chunks: list[dict]) -> CommitReviewOutput:
    context = build_context(chunks)
    system = review_prompts.REVIEW_SYSTEM
    user = review_prompts.build_review_prompt(diff_text, requirement_text, context)
    return await _adapter.complete(system, user, CommitReviewOutput)

async def dispatch_pr_generation(requirement_text: str, diff_summary: str, findings: list[dict]) -> PRDraftOutput:
    system = pr_draft_prompts.PR_DRAFT_SYSTEM
    user = pr_draft_prompts.build_pr_draft_prompt(requirement_text, diff_summary, findings)
    return await _adapter.complete(system, user, PRDraftOutput)
