from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


@asynccontextmanager
async def get_worker_session() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for Celery workers.

    Creates a dedicated AsyncEngine with NullPool bound strictly to the current
    asyncio event loop and disposes it upon completion. This prevents stale SSL
    sockets and closed event loop errors across prefork worker task invocations.
    """
    worker_engine = create_async_engine(
        settings.database_url,
        echo=False,
        poolclass=NullPool,
    )
    session_factory = async_sessionmaker(worker_engine, expire_on_commit=False)
    async with session_factory() as session:
        try:
            yield session
        finally:
            await worker_engine.dispose()
