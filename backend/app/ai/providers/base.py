from abc import ABC, abstractmethod
from pydantic import BaseModel

class ProviderAdapter(ABC):
    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]) -> BaseModel:
        """Send prompts to the provider and return a validated Pydantic model."""
        pass
