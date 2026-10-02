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

    async def chat_complete(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> str:
        return await self.router.chat_complete(
            messages, temperature=temperature, max_tokens=max_tokens
        )
