from pydantic import BaseModel

from app.ai.providers.base import ProviderAdapter
from app.ai.providers.multi_provider import MultiProviderRouter, ai_router


class LiteLLMAdapter(ProviderAdapter):
    """Backward-compatible adapter that routes calls to the resilient MultiProviderRouter."""

    def __init__(self, router: MultiProviderRouter | None = None):
        self.router = router or ai_router
        self.client = self.router.client

    async def complete(
        self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]
    ) -> BaseModel:
        return await self.router.complete(system_prompt, user_prompt, response_model)
