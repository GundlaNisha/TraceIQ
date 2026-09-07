import asyncio
import logging
from collections.abc import Callable, Coroutine
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")
_background_tasks: set[asyncio.Task] = set()


def run_async(
    coro_or_fn: Coroutine[Any, Any, T] | Callable[..., Coroutine[Any, Any, T]],
    *args: Any,
    **kwargs: Any,
) -> Any:
    """Safely executes an async coroutine from synchronous Celery tasks or eager handlers.

    - Outside an active event loop (e.g. standalone Celery worker process):
      Executes synchronously via asyncio.run().
    - Inside a running event loop (e.g. Celery eager mode inside FastAPI/Uvicorn):
      Schedules the coroutine on the running loop as an asyncio.Task, preventing
      RuntimeError('asyncio.run() cannot be called from a running event loop') and
      allowing the HTTP request to return immediately while the task executes in background.
    """
    coro: Coroutine[Any, Any, T] = (
        coro_or_fn(*args, **kwargs) if callable(coro_or_fn) else coro_or_fn
    )

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        task = loop.create_task(coro)
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
        return task
    else:
        return asyncio.run(coro)
