"""Multi-Provider AI Router with Round-Robin Scheduling & Instant Automatic Failover.

Architected for production resilience:
1. Supports Google Gemini, OpenCode Zen, and Groq (with custom/OpenAI fallback).
2. Round-Robin Load Balancing across active providers to prevent quota/rate-limit bottlenecks.
3. Instant Automatic Failover: if any provider errors (429, timeout, 5xx), the identical request
   is immediately routed to the next healthy provider without downtime.
4. Adaptive Circuit Breaker: degraded providers enter temporary cooldown (default 60s) and automatically
   recover once cooldown expires.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import instructor
from litellm import acompletion
from pydantic import BaseModel

from app.ai.providers.base import ProviderAdapter
from app.core.config import settings

logger = logging.getLogger(__name__)


class AllAIProvidersFailedError(RuntimeError):
    """Raised when every configured AI provider in the failover chain has failed."""

    def __init__(self, errors: list[tuple[str, str]]) -> None:
        self.errors = errors
        summary = " | ".join(f"[{name}] {err}" for name, err in errors)
        super().__init__(f"All AI providers exhausted without success: {summary}")


@dataclass
class AIProviderConfig:
    """Descriptor and runtime state for an individual AI provider."""

    name: str
    model: str
    api_key: str
    api_base: str | None = None
    cooldown_until: float = 0.0
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    consecutive_failures: int = 0
    last_error: str | None = None

    def is_configured(self) -> bool:
        """Return True if an API key is present for this provider."""
        return bool(self.api_key and self.api_key.strip())

    def is_healthy(self, now: float | None = None) -> bool:
        """Return True if configured and not currently in circuit breaker cooldown."""
        if not self.is_configured():
            return False
        curr_time = now if now is not None else time.time()
        return curr_time >= self.cooldown_until

    def mark_failure(self, error_msg: str, cooldown_seconds: int = 60) -> None:
        """Mark a failed call, increment stats, and activate cooldown."""
        self.failed_calls += 1
        self.consecutive_failures += 1
        self.last_error = error_msg
        self.cooldown_until = time.time() + cooldown_seconds
        logger.warning(
            f"[AI Router] Marked provider '{self.name}' as cooling down for {cooldown_seconds}s "
            f"(consecutive_failures={self.consecutive_failures}). Error: {error_msg}"
        )

    def mark_success(self) -> None:
        """Mark a successful completion and reset failure counters."""
        self.total_calls += 1
        self.successful_calls += 1
        self.consecutive_failures = 0
        self.last_error = None


class MultiProviderRouter(ProviderAdapter):
    """Production Multi-Provider AI Router with Round-Robin Scheduling & Instant Failover."""

    def __init__(self) -> None:
        # Wrap litellm's acompletion with instructor for structured Pydantic extraction
        self.client = instructor.from_litellm(acompletion)
        self._lock = asyncio.Lock()
        self._rr_counter: int = 0
        self._providers: dict[str, AIProviderConfig] = {}
        self._refresh_providers()

    def _refresh_providers(self) -> None:
        """Discover and instantiate all configured AI providers from settings and environment."""
        providers: dict[str, AIProviderConfig] = {}

        # 1. Google Gemini
        gemini_key = (
            settings.gemini_api_key
            or settings.google_api_key
            or os.getenv("GEMINI_API_KEY", "")
            or os.getenv("GOOGLE_API_KEY", "")
        )
        gemini_model = settings.gemini_model or "gemini/gemini-3.5-flash-lite"
        if not gemini_model.startswith("gemini/"):
            gemini_model = f"gemini/{gemini_model}"
        providers["gemini"] = AIProviderConfig(
            name="gemini",
            model=gemini_model,
            api_key=gemini_key,
            api_base=None,
        )

        # 2. OpenCode Zen
        opencode_key = (
            settings.opencode_api_key
            or settings.zen_api_key
            or os.getenv("OPENCODE_API_KEY", "")
            or os.getenv("ZEN_API_KEY", "")
        )
        opencode_base = settings.opencode_base_url or "https://opencode.ai/zen/v1"
        opencode_model = settings.opencode_model or "openai/zen-v1"
        if not ("/" in opencode_model):
            opencode_model = f"openai/{opencode_model}"
        providers["opencode"] = AIProviderConfig(
            name="opencode",
            model=opencode_model,
            api_key=opencode_key,
            api_base=opencode_base,
        )

        # 3. Groq
        groq_key = settings.groq_api_key or os.getenv("GROQ_API_KEY", "")
        groq_model = settings.groq_model or "groq/openai/gpt-oss-120b"
        if not groq_model.startswith("groq/"):
            groq_model = f"groq/{groq_model}"
        providers["groq"] = AIProviderConfig(
            name="groq",
            model=groq_model,
            api_key=groq_key,
            api_base=None,
        )

        # 4. Optional Custom / OpenAI Legacy Provider
        legacy_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY", "")
        legacy_base = settings.llm_base_url or settings.openai_api_base or os.getenv("LLM_BASE_URL", "")
        legacy_model = settings.llm_model or "openai/gpt-4o-mini"
        if legacy_base and not ("/" in legacy_model):
            legacy_model = f"openai/{legacy_model}"
        if legacy_key or (legacy_base and settings.llm_model):
            providers["openai"] = AIProviderConfig(
                name="openai",
                model=legacy_model,
                api_key=legacy_key,
                api_base=legacy_base or None,
            )

        self._providers = providers

    def get_configured_providers(self) -> list[AIProviderConfig]:
        """Return list of providers with non-empty credentials."""
        self._refresh_providers_if_keys_changed()
        return [p for p in self._providers.values() if p.is_configured()]

    def _refresh_providers_if_keys_changed(self) -> None:
        """Check if any environment keys were dynamically injected."""
        g_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
        o_key = settings.opencode_api_key or os.getenv("OPENCODE_API_KEY", "") or os.getenv("ZEN_API_KEY", "")
        gr_key = settings.groq_api_key or os.getenv("GROQ_API_KEY", "")

        if (
            (g_key and not self._providers.get("gemini", AIProviderConfig("g", "", "")).api_key)
            or (o_key and not self._providers.get("opencode", AIProviderConfig("o", "", "")).api_key)
            or (gr_key and not self._providers.get("groq", AIProviderConfig("gr", "", "")).api_key)
        ):
            self._refresh_providers()

    async def _select_candidate_queue(self) -> list[AIProviderConfig]:
        """Build the ordered list of providers to attempt, adhering to round-robin or priority."""
        self._refresh_providers_if_keys_changed()
        configured = self.get_configured_providers()

        if not configured:
            # Fallback to gemini even if unconfigured so litellm produces descriptive auth error
            gemini_prov = self._providers.get("gemini")
            return [gemini_prov] if gemini_prov else list(self._providers.values())

        now = time.time()
        healthy = [p for p in configured if p.is_healthy(now)]

        # If every configured provider is in cooldown, pick all configured sorted by nearest recovery
        if not healthy:
            logger.warning("[AI Router] All configured providers are currently in cooldown. Attempting nearest recovery.")
            healthy = sorted(configured, key=lambda p: p.cooldown_until)

        strategy = getattr(settings, "ai_strategy", "round_robin")

        if strategy == "round_robin" and len(healthy) > 1:
            async with self._lock:
                idx = self._rr_counter % len(healthy)
                self._rr_counter += 1
                primary = healthy[idx]
            # Primary first, then remaining healthy in rotation, then any cooling-down as last resort
            remaining_healthy = [p for p in healthy if p.name != primary.name]
            cooling_down = [p for p in configured if p not in healthy]
            return [primary] + remaining_healthy + cooling_down
        else:
            # Priority strategy: order by settings.ai_provider_order or declaration order
            order_pref = [
                x.strip().lower() for x in getattr(settings, "ai_provider_order", "gemini,opencode,groq").split(",")
            ]
            ordered = sorted(
                healthy,
                key=lambda p: order_pref.index(p.name) if p.name in order_pref else 99,
            )
            cooling_down = [p for p in configured if p not in healthy]
            return ordered + cooling_down

    async def complete(
        self, system_prompt: str, user_prompt: str, response_model: type[BaseModel]
    ) -> BaseModel:
        """Dispatch prompt through round-robin scheduled provider with automatic instant failover."""
        candidate_queue = await self._select_candidate_queue()
        cooldown_sec = getattr(settings, "ai_provider_cooldown_seconds", 60)
        errors: list[tuple[str, str]] = []

        for provider in candidate_queue:
            extra_kwargs: dict[str, Any] = {}
            if provider.api_key:
                extra_kwargs["api_key"] = provider.api_key
            if provider.api_base:
                extra_kwargs["api_base"] = provider.api_base

            model_name = provider.model
            if provider.api_base and not ("/" in model_name):
                model_name = f"openai/{model_name}"

            logger.info(
                f"[AI Router] Routing completion request to provider '{provider.name}' (model: {model_name})"
            )

            try:
                result = await self.client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_model=response_model,
                    max_retries=2,
                    **extra_kwargs,
                )
                provider.mark_success()
                logger.info(f"[AI Router] Provider '{provider.name}' completed request successfully.")
                return result
            except Exception as e:
                err_msg = f"{type(e).__name__}: {e!s}"
                provider.mark_failure(err_msg, cooldown_seconds=cooldown_sec)
                errors.append((provider.name, err_msg))
                logger.warning(
                    f"[AI Failover] Provider '{provider.name}' ({model_name}) failed: {err_msg}. "
                    "Initiating immediate failover to next provider..."
                )

        # If every candidate provider failed
        logger.error(f"[AI Router] All providers failed. Attempt summary: {errors}")
        raise AllAIProvidersFailedError(errors)

    async def chat_complete(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> str:
        """Dispatch conversational chat completion through round-robin scheduled provider with automatic instant failover."""
        candidate_queue = await self._select_candidate_queue()
        cooldown_sec = getattr(settings, "ai_provider_cooldown_seconds", 60)
        errors: list[tuple[str, str]] = []

        for provider in candidate_queue:
            extra_kwargs: dict[str, Any] = {}
            if provider.api_key:
                extra_kwargs["api_key"] = provider.api_key
            if provider.api_base:
                extra_kwargs["api_base"] = provider.api_base

            model_name = provider.model
            if provider.api_base and not ("/" in model_name):
                model_name = f"openai/{model_name}"

            logger.info(
                f"[AI Router] Routing chat_complete request to provider '{provider.name}' (model: {model_name})"
            )

            try:
                response = await acompletion(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **extra_kwargs,
                )
                content = response.choices[0].message.content or ""
                provider.mark_success()
                logger.info(f"[AI Router] Provider '{provider.name}' completed chat request successfully.")
                return content
            except Exception as e:
                err_msg = f"{type(e).__name__}: {e!s}"
                provider.mark_failure(err_msg, cooldown_seconds=cooldown_sec)
                errors.append((provider.name, err_msg))
                logger.warning(
                    f"[AI Failover] Provider '{provider.name}' ({model_name}) failed during chat_complete: {err_msg}. "
                    "Initiating immediate failover to next provider..."
                )

        # If every candidate provider failed
        logger.error(f"[AI Router] All providers failed in chat_complete. Attempt summary: {errors}")
        raise AllAIProvidersFailedError(errors)

    def get_status(self) -> dict[str, Any]:
        """Return operational telemetry and health states for all managed providers."""
        now = time.time()
        return {
            "strategy": getattr(settings, "ai_strategy", "round_robin"),
            "providers": {
                p.name: {
                    "model": p.model,
                    "configured": p.is_configured(),
                    "healthy": p.is_healthy(now),
                    "cooldown_remaining_seconds": max(0, int(p.cooldown_until - now)),
                    "total_calls": p.total_calls,
                    "successful_calls": p.successful_calls,
                    "failed_calls": p.failed_calls,
                    "consecutive_failures": p.consecutive_failures,
                    "last_error": p.last_error,
                }
                for p in self._providers.values()
            },
        }


# Global MultiProviderRouter singleton
ai_router = MultiProviderRouter()
