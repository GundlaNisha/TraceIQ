import time
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db

router = APIRouter(prefix="/api/v1/health", tags=["health"])

_START_TIME = time.time()


@router.get("", summary="Comprehensive Service Health Check")
async def health_check(db: AsyncSession = Depends(get_db)) -> Any:
    """Production health check probe for load balancers, container orchestrators,

    and uptime monitoring agents.
    """
    services_status: dict[str, str] = {}
    is_healthy = True

    # 1. Database Connectivity Probe
    try:
        await db.execute(text("SELECT 1"))
        services_status["database"] = "healthy"
    except Exception as e:
        services_status["database"] = f"unhealthy: {e!s}"
        is_healthy = False

    # 2. Redis Connection Probe
    if settings.redis_url:
        try:
            import redis.asyncio as aioredis

            r = aioredis.from_url(settings.redis_url, socket_timeout=2.0)
            await r.ping()
            await r.aclose()
            services_status["redis"] = "healthy"
        except Exception as e:
            services_status["redis"] = f"unhealthy: {e!s}"
            # Non-fatal if eager execution is enabled, but report status
            if not getattr(settings, "celery_always_eager", False):
                is_healthy = False
    else:
        services_status["redis"] = "not_configured"

    uptime_seconds = int(time.time() - _START_TIME)

    response_payload = {
        "status": "healthy" if is_healthy else "degraded",
        "version": "1.0.0",
        "environment": settings.environment,
        "uptime_seconds": uptime_seconds,
        "timestamp": datetime.now(UTC).isoformat(),
        "services": services_status,
    }

    status_code = (
        status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    return JSONResponse(content=response_payload, status_code=status_code)


@router.get("/liveness", summary="Quick Liveness Probe")
async def liveness_probe() -> dict[str, str]:
    """Lightweight probe for Kubernetes/ECS liveness checks."""
    return {"status": "alive"}
