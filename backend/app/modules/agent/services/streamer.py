from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncGenerator
from typing import Any, Optional
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory pub/sub fallback bus for testing and local environments when Redis is offline
_memory_subscribers: dict[str, list[asyncio.Queue]] = {}


def _get_channel_name(session_id: str) -> str:
    return f"agent:stream:{session_id}"


async def get_redis_client() -> Optional[aioredis.Redis]:
    """Creates a Redis client if redis_url is configured, handling SSL if needed."""
    if not settings.redis_url or settings.is_celery_eager:
        return None
    try:
        kwargs: dict[str, Any] = {"decode_responses": True, "socket_timeout": 3.0}
        if settings.redis_url.startswith("rediss://"):
            kwargs["ssl_cert_reqs"] = None
        client = aioredis.from_url(settings.redis_url, **kwargs)
        await client.ping()
        return client
    except Exception as e:
        logger.debug(f"Redis unavailable, falling back to memory pubsub: {e}")
        return None


async def publish_agent_event(
    session_id: str,
    event_type: str,
    data: dict[str, Any],
) -> None:
    """
    Publishes an agent event (token, reasoning, approval_request, error, done)
    to the active Redis pub/sub channel or internal queue.
    """
    payload = {
        "type": event_type,
        "data": data,
        "session_id": session_id,
        "timestamp": time.time(),
    }
    raw_json = json.dumps(payload)

    # 1. Attempt Redis publish
    redis = await get_redis_client()
    if redis is not None:
        try:
            await redis.publish(_get_channel_name(session_id), raw_json)
            await redis.aclose()
            return
        except Exception as e:
            logger.warning(f"Failed to publish event to Redis: {e}")

    # 2. In-memory queue distribution fallback
    if session_id in _memory_subscribers:
        for q in _memory_subscribers[session_id]:
            await q.put(payload)


async def subscribe_agent_events(
    session_id: str,
    heartbeat_interval: float = 15.0,
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Subscribes to live streaming events for a specific agent session.
    Yields event payloads as dicts for Server-Sent Events (SSE).
    """
    channel_name = _get_channel_name(session_id)
    redis = await get_redis_client()

    if redis is not None:
        pubsub = redis.pubsub()
        try:
            await pubsub.subscribe(channel_name)
            while True:
                try:
                    message = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0),
                        timeout=heartbeat_interval,
                    )
                    if message and message.get("type") == "message":
                        data_str = message.get("data")
                        if data_str:
                            event = json.loads(data_str)
                            yield event
                            if event.get("type") in ("done", "error"):
                                break
                    elif message is None:
                        # Yield heartbeat comment to keep SSE connection alive
                        yield {"type": "ping", "data": {}, "timestamp": time.time()}
                except asyncio.TimeoutError:
                    yield {"type": "ping", "data": {}, "timestamp": time.time()}
        finally:
            await pubsub.unsubscribe(channel_name)
            await pubsub.aclose()
            await redis.aclose()
    else:
        # Fallback to local async queue
        q: asyncio.Queue = asyncio.Queue()
        if session_id not in _memory_subscribers:
            _memory_subscribers[session_id] = []
        _memory_subscribers[session_id].append(q)

        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=heartbeat_interval)
                    yield event
                    if event.get("type") in ("done", "error"):
                        break
                except asyncio.TimeoutError:
                    yield {"type": "ping", "data": {}, "timestamp": time.time()}
        finally:
            if session_id in _memory_subscribers and q in _memory_subscribers[session_id]:
                _memory_subscribers[session_id].remove(q)
                if not _memory_subscribers[session_id]:
                    _memory_subscribers.pop(session_id, None)
