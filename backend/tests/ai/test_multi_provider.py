import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from pydantic import BaseModel

from app.ai.providers.multi_provider import (
    AIProviderConfig,
    AllAIProvidersFailedError,
    MultiProviderRouter,
)
from app.core.config import settings


class DummyOutput(BaseModel):
    summary: str
    status: str


@pytest.fixture
def mock_router():
    router = MultiProviderRouter()
    # Inject 3 clean mock providers
    router._providers = {
        "gemini": AIProviderConfig(
            name="gemini",
            model="gemini/gemini-2.5-flash",
            api_key="mock_gemini_key",
        ),
        "opencode": AIProviderConfig(
            name="opencode",
            model="openai/zen-v1",
            api_key="mock_opencode_key",
            api_base="https://opencode.ai/zen/v1",
        ),
        "groq": AIProviderConfig(
            name="groq",
            model="groq/llama-3.3-70b-versatile",
            api_key="mock_groq_key",
        ),
    }
    # Mock client
    router.client = MagicMock()
    router.client.chat.completions.create = AsyncMock()
    return router


@pytest.mark.asyncio
async def test_provider_config_health_and_cooldown():
    prov = AIProviderConfig(
        name="test_prov",
        model="mock/model",
        api_key="valid_key",
    )
    assert prov.is_configured() is True
    assert prov.is_healthy() is True

    # Mark failure with 2s cooldown
    prov.mark_failure("Rate limit 429", cooldown_seconds=2)
    assert prov.is_healthy() is False
    assert prov.consecutive_failures == 1
    assert prov.failed_calls == 1

    # Simulate time passing beyond cooldown
    now_future = time.time() + 3
    assert prov.is_healthy(now=now_future) is True

    # Mark success
    prov.mark_success()
    assert prov.consecutive_failures == 0
    assert prov.successful_calls == 1
    assert prov.total_calls == 1


@pytest.mark.asyncio
async def test_round_robin_load_balancing(mock_router):
    settings.ai_strategy = "round_robin"
    mock_router.client.chat.completions.create.return_value = DummyOutput(
        summary="Success", status="ok"
    )

    # Call 1 -> Gemini
    res1 = await mock_router.complete("sys", "user", DummyOutput)
    call_args1 = mock_router.client.chat.completions.create.call_args[1]
    assert call_args1["model"] == "gemini/gemini-2.5-flash"
    assert res1.summary == "Success"

    # Call 2 -> OpenCode Zen
    res2 = await mock_router.complete("sys", "user", DummyOutput)
    call_args2 = mock_router.client.chat.completions.create.call_args[1]
    assert call_args2["model"] == "openai/zen-v1"
    assert call_args2["api_base"] == "https://opencode.ai/zen/v1"

    # Call 3 -> Groq
    res3 = await mock_router.complete("sys", "user", DummyOutput)
    call_args3 = mock_router.client.chat.completions.create.call_args[1]
    assert call_args3["model"] == "groq/llama-3.3-70b-versatile"

    # Call 4 -> Wraps back to Gemini
    res4 = await mock_router.complete("sys", "user", DummyOutput)
    call_args4 = mock_router.client.chat.completions.create.call_args[1]
    assert call_args4["model"] == "gemini/gemini-2.5-flash"


@pytest.mark.asyncio
async def test_instant_automatic_failover(mock_router):
    settings.ai_strategy = "round_robin"

    # Gemini fails with 429 RateLimitError, OpenCode Zen succeeds
    async def side_effect(**kwargs):
        model = kwargs.get("model", "")
        if "gemini" in model:
            raise RuntimeError("429 Too Many Requests: Resource has been exhausted")
        return DummyOutput(summary="Fallback Success via OpenCode", status="recovered")

    mock_router.client.chat.completions.create.side_effect = side_effect

    res = await mock_router.complete("sys", "user", DummyOutput)

    # Verifications
    assert res.summary == "Fallback Success via OpenCode"
    assert res.status == "recovered"

    # Gemini should have been marked in cooldown
    gemini_prov = mock_router._providers["gemini"]
    assert gemini_prov.is_healthy() is False
    assert gemini_prov.failed_calls == 1

    # OpenCode should have succeeded
    opencode_prov = mock_router._providers["opencode"]
    assert opencode_prov.successful_calls == 1


@pytest.mark.asyncio
async def test_cooldown_provider_skipped_on_next_request(mock_router):
    settings.ai_strategy = "round_robin"

    # Put Gemini in cooldown
    mock_router._providers["gemini"].mark_failure("Quota exceeded", cooldown_seconds=60)

    # Next call should only balance between OpenCode and Groq, skipping Gemini
    mock_router.client.chat.completions.create.return_value = DummyOutput(
        summary="OK", status="ok"
    )

    await mock_router.complete("sys", "user", DummyOutput)
    called_model = mock_router.client.chat.completions.create.call_args[1]["model"]
    assert "gemini" not in called_model
    assert called_model in ("openai/zen-v1", "groq/llama-3.3-70b-versatile")


@pytest.mark.asyncio
async def test_all_providers_fail_raises_aggregate_error(mock_router):
    mock_router.client.chat.completions.create.side_effect = RuntimeError("Service Unavailable 503")

    with pytest.raises(AllAIProvidersFailedError) as exc_info:
        await mock_router.complete("sys", "user", DummyOutput)

    err = str(exc_info.value)
    assert "gemini" in err
    assert "opencode" in err
    assert "groq" in err
    assert "Service Unavailable 503" in err


@pytest.mark.asyncio
async def test_telemetry_status(mock_router):
    status = mock_router.get_status()
    assert "strategy" in status
    assert "providers" in status
    assert "gemini" in status["providers"]
    assert "opencode" in status["providers"]
    assert "groq" in status["providers"]
    assert status["providers"]["gemini"]["configured"] is True


@pytest.mark.asyncio
async def test_chat_complete_round_robin_and_failover(mock_router, monkeypatch):
    """Verify chat_complete rotates providers and fails over gracefully."""
    settings.ai_strategy = "round_robin"
    call_log = []

    class DummyChoice:
        def __init__(self, content):
            self.message = type("Msg", (), {"content": content})()

    class DummyResponse:
        def __init__(self, content):
            self.choices = [DummyChoice(content)]

    async def mock_acompletion(**kwargs):
        model = kwargs.get("model", "")
        call_log.append(model)
        if "gemini" in model:
            raise RuntimeError("Gemini Rate Limit 429")
        return DummyResponse(f"Success from {model}")

    import app.ai.providers.multi_provider as mp_mod

    monkeypatch.setattr(mp_mod, "acompletion", mock_acompletion)

    # First call: starts at gemini (fails) -> fails over to opencode (succeeds)
    res1 = await mock_router.chat_complete([{"role": "user", "content": "Hello"}])
    assert "Success from openai/zen-v1" in res1
    assert "gemini/gemini-2.5-flash" in call_log
    assert "openai/zen-v1" in call_log

    # Gemini is now cooling down, next call should use groq
    call_log.clear()
    res2 = await mock_router.chat_complete([{"role": "user", "content": "Next turn"}])
    assert "Success" in res2
    assert "gemini" not in call_log[0]

