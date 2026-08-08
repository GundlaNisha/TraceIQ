import uuid

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app.core.deps import get_current_user
from app.main import app
from app.modules.auth.models.user import User


@pytest.fixture
def mock_user():
    return User(id=uuid.UUID("12345678-1234-5678-1234-567812345678"), email="test@example.com", name="Test User")

async def test_auth_me_unauthenticated(test_client: AsyncClient):
    # Override get_current_user to simulate unauthenticated
    def override_unauth():
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    app.dependency_overrides[get_current_user] = override_unauth
        
    response = await test_client.get("/api/v1/auth/me")
    assert response.status_code == 401
    
    del app.dependency_overrides[get_current_user]

async def test_auth_me_authenticated(test_client: AsyncClient, mock_user: User):
    # Override get_current_user
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    response = await test_client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "12345678-1234-5678-1234-567812345678"
    assert data["email"] == "test@example.com"
    
    # Cleanup override
    del app.dependency_overrides[get_current_user]
