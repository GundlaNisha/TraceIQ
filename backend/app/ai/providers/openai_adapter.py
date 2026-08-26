import instructor
from litellm import acompletion
from pydantic import BaseModel

from app.ai.providers.base import ProviderAdapter
from app.core.config import settings


class LiteLLMAdapter(ProviderAdapter):
    def __init__(self):
        # We wrap litellm's acompletion with instructor
        self.client = instructor.from_litellm(acompletion)

    async def complete(
        self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]
    ) -> BaseModel:
        extra_kwargs: dict = {}
        api_base = settings.llm_base_url or settings.openai_api_base
        if settings.openai_api_key:
            extra_kwargs["api_key"] = settings.openai_api_key
        if api_base:
            extra_kwargs["api_base"] = api_base

        model = settings.llm_model
        if api_base and not ("/" in model):
            model = f"openai/{model}"

        return await self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_model=response_model,
            **extra_kwargs,
        )
