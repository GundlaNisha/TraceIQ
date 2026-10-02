import asyncio
import functools
import hashlib
import json
import logging
import ssl
from collections.abc import Callable
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, TypeVar
from uuid import UUID

import redis.asyncio as aioredis
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


class EnhancedJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder supporting Pydantic models, SQLAlchemy models, Enums, UUIDs, datetimes, and Decimal."""

    def default(self, o: Any) -> Any:
        if isinstance(o, BaseModel):
            return o.model_dump(mode="json")
        if isinstance(o, Enum):
            return o.value
        if hasattr(o, "__table__"):
            return {c.name: getattr(o, c.name) for c in o.__table__.columns}
        if isinstance(o, (UUID, Decimal)):
            return str(o)
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, set):
            return list(o)
        if isinstance(o, bytes):
            return o.decode("utf-8", errors="replace")
        return super().default(o)


class CacheService:
    """Production-grade asynchronous Redis Cache Service with graceful degradation.

    - Automatic connection pooling and SSL support.
    - Zero-downtime fallback: if Redis fails or times out, seamlessly falls back to DB.
    - Safe JSON serialization supporting UUIDs, datetimes, Enums, and Pydantic/SQLAlchemy models.
    - Non-blocking batch pattern deletion via SCAN.
    """

    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None
        self._is_connected: bool = True
        self._prefix: str = "traceiq:cache:"

    def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            extra_kwargs: dict[str, Any] = {
                "decode_responses": True,
                "socket_connect_timeout": 2.0,
                "socket_timeout": 2.0,
            }
            if settings.redis_url.startswith("rediss://"):
                extra_kwargs["ssl_cert_reqs"] = ssl.CERT_NONE

            self._client = aioredis.from_url(settings.redis_url, **extra_kwargs)
        return self._client

    async def get(self, key: str) -> Any | None:
        """Retrieve a cached JSON value by key. Returns None on cache miss or Redis error."""
        full_key = f"{self._prefix}{key}"
        try:
            client = self._get_client()
            raw = await client.get(full_key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as e:
            if self._is_connected:
                logger.warning(f"Redis cache GET failure for key '{full_key}': {e}. Gracefully skipping cache.")
                self._is_connected = False
            return None

    async def set_raw(self, key: str, raw_json: str, ttl: int = 300) -> bool:
        """Cache a raw JSON string with a Time-To-Live in seconds."""
        full_key = f"{self._prefix}{key}"
        try:
            client = self._get_client()
            await client.set(full_key, raw_json, ex=ttl)
            self._is_connected = True
            return True
        except Exception as e:
            if self._is_connected:
                logger.warning(f"Redis cache SET failure for key '{full_key}': {e}.")
                self._is_connected = False
            return False

    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Cache a JSON serializable value with a Time-To-Live in seconds."""
        try:
            serialized = json.dumps(value, cls=EnhancedJSONEncoder)
            return await self.set_raw(key, serialized, ttl=ttl)
        except Exception as e:
            logger.warning(f"Failed to serialize value for key '{key}': {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete an exact cache key."""
        full_key = f"{self._prefix}{key}"
        try:
            client = self._get_client()
            res = await client.delete(full_key)
            return bool(res)
        except Exception as e:
            logger.warning(f"Redis cache DELETE failure for key '{full_key}': {e}.")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Atomically find and delete all keys matching pattern using non-blocking SCAN.

        Example: delete_pattern("ws:123:*")
        """
        full_pattern = f"{self._prefix}{pattern}"
        deleted_count = 0
        try:
            client = self._get_client()
            keys_to_delete = []
            async for k in client.scan_iter(match=full_pattern, count=100):
                keys_to_delete.append(k)
                if len(keys_to_delete) >= 100:
                    deleted_count += await client.delete(*keys_to_delete)
                    keys_to_delete = []

            if keys_to_delete:
                deleted_count += await client.delete(*keys_to_delete)

            self._is_connected = True
            if deleted_count > 0:
                logger.info(f"Invalidated {deleted_count} cache keys matching '{full_pattern}'.")
            return deleted_count
        except Exception as e:
            logger.warning(f"Redis cache DELETE_PATTERN failure for '{full_pattern}': {e}.")
            return 0

    async def invalidate_workspace(self, workspace_id: str | UUID, sub_resource: str | None = None) -> int:
        """Invalidate all cache entries belonging to a specific workspace."""
        ws_str = str(workspace_id)
        if sub_resource:
            pattern = f"ws:{ws_str}:{sub_resource}*"
        else:
            pattern = f"ws:{ws_str}:*"
        return await self.delete_pattern(pattern)

    async def invalidate_user(self, user_id: str | UUID, sub_resource: str | None = None) -> int:
        """Invalidate all cache entries belonging to a specific user."""
        u_str = str(user_id)
        if sub_resource:
            pattern = f"user:{u_str}:{sub_resource}*"
        else:
            pattern = f"user:{u_str}:*"
        return await self.delete_pattern(pattern)

    async def close(self) -> None:
        """Close connection pool cleanly upon application shutdown."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# Global Cache Singleton
cache = CacheService()


def build_cache_key(prefix: str, *args: Any, **kwargs: Any) -> str:
    """Helper to deterministically build a cache key from arguments."""
    payload_parts = []
    for a in args:
        if isinstance(a, (str, int, float, bool, UUID)):
            payload_parts.append(str(a))
    for k in sorted(kwargs.keys()):
        v = kwargs[k]
        if isinstance(v, (str, int, float, bool, UUID)):
            payload_parts.append(f"{k}={v}")
        elif v is not None:
            # Hash complex params (dict, list, etc.)
            hashed = hashlib.sha256(json.dumps(v, cls=EnhancedJSONEncoder, sort_keys=True).encode()).hexdigest()[:8]
            payload_parts.append(f"{k}={hashed}")

    suffix = ":".join(payload_parts)
    return f"{prefix}:{suffix}" if suffix else prefix


def cached(
    ttl: int = 300,
    prefix: str = "",
    key_builder: Callable[..., str] | None = None,
) -> Callable:
    """Decorator to cache asynchronous endpoint and service results in Redis with auto-fallback.

    Args:
        ttl: Time to live in seconds (default 300s = 5 minutes).
        prefix: Cache key prefix (e.g. 'ws:{workspace_id}:summary').
        key_builder: Optional custom function receiving (*args, **kwargs) to return exact cache key.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Construct key
            if key_builder:
                key = key_builder(*args, **kwargs)
            else:
                # Format prefix with kwargs if placeholders exist (e.g., prefix='ws:{workspace_id}:summary')
                formatted_prefix = prefix
                used_in_prefix = set()
                if "{" in prefix and "}" in prefix:
                    try:
                        formatted_prefix = prefix.format(**kwargs)
                        import string
                        field_names = [f[1] for f in string.Formatter().parse(prefix) if f[1]]
                        used_in_prefix = {f.split(".")[0] for f in field_names}
                    except KeyError:
                        formatted_prefix = prefix

                # Remaining query parameters hashed
                filter_kwargs = {
                    k: v
                    for k, v in kwargs.items()
                    if k not in ("db", "session", "request", "current_user", "background_tasks")
                    and k not in used_in_prefix
                }
                key = build_cache_key(formatted_prefix, **filter_kwargs)

            # 1. Attempt cache lookup
            cached_data = await cache.get(key)
            if cached_data is not None:
                return cached_data

            # 2. Cache miss -> execute underlying function
            result = await func(*args, **kwargs)

            # 3. Store result in cache asynchronously
            if result is not None:
                try:
                    raw_json = json.dumps(result, cls=EnhancedJSONEncoder)
                    asyncio.create_task(cache.set_raw(key, raw_json, ttl=ttl))
                except Exception as e:
                    logger.warning(f"Failed to serialize result for cache key '{key}': {e}")

            return result

        return wrapper

    return decorator
