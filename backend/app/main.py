import asyncio
import logging
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config
from alembic import command
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.modules.auth.routes.auth import router as auth_router
from app.modules.auth.routes.webhook import router as webhook_router
from app.modules.dashboard.routes.dashboard import router as dashboard_router
from app.modules.github.routes.callback import router as github_callback_router
from app.modules.github.routes.checks import router as github_checks_router
from app.modules.github.routes.prs import router as github_prs_router
from app.modules.github.routes.webhook import router as github_webhook_router
from app.modules.health.routes.health import router as health_router
from app.modules.impact.routes.analysis import router as analysis_router
from app.modules.agent.routes.agent_router import router as agent_router
from app.modules.jira.routes.jira import router as jira_router
from app.modules.repository.routes.repo import router as repo_router
from app.modules.requirement.routes.req import router as req_router
from app.modules.retrieval.routes.search import router as search_router
from app.modules.review.routes.pr_review import router as pr_review_router
from app.modules.traceability.routes.traceability import router as traceability_router
from app.modules.workspace.routes.workspace import router as workspace_router

logger = logging.getLogger(__name__)

_START_TIME = time.time()


def _run_migrations() -> None:
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic database migrations applied successfully.")
    except Exception as e:
        logger.warning(f"Alembic auto-migration notice: {e}")


from app.core.cache import cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.database_url:
        asyncio.create_task(asyncio.to_thread(_run_migrations))
    yield
    await cache.close()


app = FastAPI(title="TraceIQ API", version="1.0.0", lifespan=lifespan)

raw_allowed = (
    settings.allowed_origins
    if isinstance(settings.allowed_origins, list)
    else [s.strip() for s in settings.allowed_origins.split(",") if s.strip()]
    if settings.allowed_origins
    else []
)
cors_origins = list(dict.fromkeys(
    ["http://localhost:3000", "http://127.0.0.1:3000"]
    + ([settings.frontend_url] if settings.frontend_url else [])
    + raw_allowed
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:[0-9]+)?|https://.*\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)

# Routers
app.include_router(auth_router)
app.include_router(health_router)
app.include_router(webhook_router)
app.include_router(repo_router)
app.include_router(search_router)
app.include_router(req_router)
app.include_router(analysis_router)
app.include_router(pr_review_router)
app.include_router(traceability_router)
app.include_router(dashboard_router)
app.include_router(github_callback_router)
app.include_router(github_webhook_router)
app.include_router(github_prs_router)
app.include_router(github_checks_router)
app.include_router(workspace_router)
app.include_router(jira_router)
app.include_router(agent_router)


@app.get("/", summary="TraceIQ Root API Index", tags=["general"])
async def root() -> dict[str, Any]:
    return {
        "name": "TraceIQ API",
        "description": "Autonomous Code Impact Blast Radius Analysis, AST Code Graph Traversal & Automated PR Review Intelligence",
        "version": "1.0.0",
        "status": "operational",
        "environment": settings.environment,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "openapi_url": "/openapi.json",
        "health_check_url": "/health",
        "endpoints": {
            "health": "/health",
            "api_health": "/api/v1/health",
            "ai_health": "/api/v1/health/ai",
            "liveness": "/api/v1/health/liveness",
            "repositories": "/api/v1/repos",
            "impact_analysis": "/api/v1/impact",
            "pr_reviews": "/api/v1/pr-reviews",
            "requirements": "/api/v1/requirements",
            "traceability": "/api/v1/traceability",
            "jira": "/api/v1/jira",
            "workspaces": "/api/v1/workspaces",
            "agent": "/api/v1/agent",
        },
    }


@app.get("/health", summary="Service Health Check", tags=["health"])
async def health(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    services: dict[str, str] = {}
    is_healthy = True

    # 1. Database Connectivity Probe
    if settings.database_url:
        try:
            await db.execute(text("SELECT 1"))
            services["database"] = "healthy"
        except Exception as e:
            services["database"] = f"unhealthy: {e!s}"
            is_healthy = False
    else:
        services["database"] = "not_configured"

    # 2. Redis Connection Probe
    if settings.redis_url:
        try:
            import redis.asyncio as aioredis

            r = aioredis.from_url(settings.redis_url, socket_timeout=2.0)
            await r.ping()
            await r.aclose()
            services["redis"] = "healthy"
        except Exception as e:
            services["redis"] = f"unhealthy: {e!s}"
            if not getattr(settings, "celery_always_eager", False):
                is_healthy = False
    else:
        services["redis"] = "not_configured"

    uptime_seconds = int(time.time() - _START_TIME)

    return {
        "status": "healthy" if is_healthy else "degraded",
        "version": "1.0.0",
        "environment": settings.environment,
        "uptime_seconds": uptime_seconds,
        "timestamp": datetime.now(UTC).isoformat(),
        "services": services,
        "celery": {
            "always_eager": getattr(settings, "is_celery_eager", False),
        },
    }


@app.api_route("/api/machines/host/sync", methods=["GET", "POST", "OPTIONS"])
async def machines_host_sync():
    return {"status": "ok", "synced": True}

