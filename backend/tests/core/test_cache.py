import asyncio
from datetime import datetime
from uuid import uuid4
import pytest
from pydantic import BaseModel

from app.core.cache import CacheService, EnhancedJSONEncoder, cached, build_cache_key


class DummyModel(BaseModel):
    id: str
    name: str
    created_at: datetime


@pytest.mark.asyncio
async def test_cache_set_and_get():
    service = CacheService()
    test_id = str(uuid4())
    key = f"test:item:{test_id}"
    data = {
        "id": test_id,
        "count": 42,
        "uuid": uuid4(),
        "timestamp": datetime.now(),
    }

    # Set
    success = await service.set(key, data, ttl=10)
    assert success is True

    # Get
    cached_val = await service.get(key)
    assert cached_val is not None
    assert cached_val["id"] == test_id
    assert cached_val["count"] == 42

    # Delete
    del_res = await service.delete(key)
    assert del_res is True

    # Verify deleted
    empty = await service.get(key)
    assert empty is None


@pytest.mark.asyncio
async def test_cache_pydantic_model():
    service = CacheService()
    test_id = str(uuid4())
    key = f"test:pydantic:{test_id}"
    model = DummyModel(id=test_id, name="Test Item", created_at=datetime.now())

    success = await service.set(key, model, ttl=10)
    assert success is True

    cached_val = await service.get(key)
    assert cached_val is not None
    assert cached_val["id"] == test_id
    assert cached_val["name"] == "Test Item"

    await service.delete(key)


@pytest.mark.asyncio
async def test_cache_delete_pattern():
    service = CacheService()
    ws_id = str(uuid4())
    await service.set(f"ws:{ws_id}:summary", {"stats": 1}, ttl=30)
    await service.set(f"ws:{ws_id}:repos", [{"repo": "a"}], ttl=30)
    await service.set(f"ws:{ws_id}:jira:issues", [{"key": "T-1"}], ttl=30)

    # Invalidate workspace
    deleted = await service.invalidate_workspace(ws_id)
    assert deleted >= 3

    # All should be gone
    assert await service.get(f"ws:{ws_id}:summary") is None
    assert await service.get(f"ws:{ws_id}:repos") is None
    assert await service.get(f"ws:{ws_id}:jira:issues") is None


@pytest.mark.asyncio
async def test_cached_decorator():
    call_counter = 0

    @cached(ttl=10, prefix="test:calc:{item_id}")
    async def get_expensive_data(item_id: str, multiplier: int = 1):
        nonlocal call_counter
        call_counter += 1
        return {"item_id": item_id, "result": 100 * multiplier, "calls": call_counter}

    item_id = str(uuid4())

    # Call 1: Cache Miss
    res1 = await get_expensive_data(item_id=item_id, multiplier=2)
    assert res1["calls"] == 1
    assert call_counter == 1

    # Give background task 50ms to set cache in Redis
    await asyncio.sleep(0.05)

    # Call 2: Cache Hit (should not increment call_counter)
    res2 = await get_expensive_data(item_id=item_id, multiplier=2)
    assert res2["calls"] == 1
    assert call_counter == 1

    # Clean up
    cache_service = CacheService()
    await cache_service.delete_pattern(f"test:calc:{item_id}*")


class MockEnum(str):
    OWNER = "owner"
    ADMIN = "admin"


class MockColumn:
    def __init__(self, name: str):
        self.name = name


class MockTable:
    columns = [MockColumn("id"), MockColumn("title")]


class MockORMModel:
    __table__ = MockTable()

    def __init__(self, id_val: str, title_val: str):
        self.id = id_val
        self.title = title_val


@pytest.mark.asyncio
async def test_cache_orm_and_enums():
    from enum import Enum

    class RoleEnum(str, Enum):
        admin = "admin"
        member = "member"

    service = CacheService()
    test_id = str(uuid4())
    key = f"test:orm:{test_id}"

    orm_obj = MockORMModel(test_id, "Sample ORM")
    data = {
        "model": orm_obj,
        "role": RoleEnum.admin,
    }

    success = await service.set(key, data, ttl=10)
    assert success is True

    cached_val = await service.get(key)
    assert cached_val is not None
    assert cached_val["model"]["id"] == test_id
    assert cached_val["model"]["title"] == "Sample ORM"
    assert cached_val["role"] == "admin"

    await service.delete(key)


@pytest.mark.asyncio
async def test_cache_set_raw():
    service = CacheService()
    key = f"test:raw:{uuid4()}"
    raw_payload = '{"direct": true, "number": 123}'

    ok = await service.set_raw(key, raw_payload, ttl=10)
    assert ok is True

    retrieved = await service.get(key)
    assert retrieved == {"direct": True, "number": 123}

    await service.delete(key)


@pytest.mark.asyncio
async def test_cached_with_custom_key_builder():
    call_count = 0

    def custom_builder(*args, **kwargs):
        return f"custom:builder:{kwargs.get('tenant')}"

    @cached(ttl=10, key_builder=custom_builder)
    async def sample_fn(tenant: str):
        nonlocal call_count
        call_count += 1
        return {"tenant": tenant, "call": call_count}

    t_id = str(uuid4())
    r1 = await sample_fn(tenant=t_id)
    assert r1["call"] == 1

    await asyncio.sleep(0.05)

    r2 = await sample_fn(tenant=t_id)
    assert r2["call"] == 1
    assert call_count == 1

    service = CacheService()
    await service.delete(f"custom:builder:{t_id}")

