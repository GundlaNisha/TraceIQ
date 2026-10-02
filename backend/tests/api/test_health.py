import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
async def direct_client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


async def test_health_liveness(direct_client: AsyncClient):
    response = await direct_client.get("/api/v1/health/liveness")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


async def test_health_ai_telemetry(direct_client: AsyncClient):
    response = await direct_client.get("/api/v1/health/ai")
    assert response.status_code == 200
    data = response.json()
    assert "strategy" in data
    assert "providers" in data
    providers = data["providers"]
    assert "gemini" in providers
    assert "opencode" in providers
    assert "groq" in providers
    assert "model" in providers["gemini"]
    assert "healthy" in providers["gemini"]
    assert "cooldown_remaining_seconds" in providers["gemini"]

