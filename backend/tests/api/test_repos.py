import pytest
from httpx import AsyncClient

from app.core.deps import get_current_user
from app.main import app
from app.modules.auth.models.user import User


@pytest.fixture
def mock_user_a():
    return User(id="user_test_a", email="a@example.com", name="User A")


@pytest.fixture
def mock_user_b():
    return User(id="user_test_b", email="b@example.com", name="User B")


async def test_repo_tenant_isolation(
    test_client: AsyncClient, mock_user_a: User, mock_user_b: User
):
    # 1. Create a repo as User A
    app.dependency_overrides[get_current_user] = lambda: mock_user_a

    create_response = await test_client.post(
        "/api/v1/repositories", json={"repo_url": "https://github.com/fastapi/fastapi"}
    )
    assert create_response.status_code == 201
    repo_id = create_response.json()["id"]

    # 2. Try to fetch as User B
    app.dependency_overrides[get_current_user] = lambda: mock_user_b
    fetch_b_response = await test_client.get(f"/api/v1/repositories/{repo_id}")
    assert fetch_b_response.status_code == 404

    # 3. Try to fetch as User A again
    app.dependency_overrides[get_current_user] = lambda: mock_user_a
    fetch_a_response = await test_client.get(f"/api/v1/repositories/{repo_id}")
    assert fetch_a_response.status_code == 200

    # 4. Delete as User A
    delete_response = await test_client.delete(f"/api/v1/repositories/{repo_id}")
    assert delete_response.status_code == 204

    # 5. Fetch after deletion
    fetch_deleted_response = await test_client.get(f"/api/v1/repositories/{repo_id}")
    assert fetch_deleted_response.status_code == 404

    # Cleanup override
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
