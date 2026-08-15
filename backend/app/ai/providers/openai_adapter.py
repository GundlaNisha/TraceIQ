import instructor
from litellm import acompletion
from pydantic import BaseModel

from app.ai.providers.base import ProviderAdapter


class LiteLLMAdapter(ProviderAdapter):
    def __init__(self):
        # We wrap litellm's acompletion with instructor
        self.client = instructor.from_litellm(acompletion)

    async def complete(
        self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]
    ) -> BaseModel:
        return await self.client.chat.completions.create(
            # For Opencode Zen or standard OpenAI, we prefix the model name
            model="openai/deepseek-v4-flash-free",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_model=response_model,
        )
