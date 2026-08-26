import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config
from alembic import command

from app.core.config import settings
from app.modules.auth.routes.auth import router as auth_router
from app.modules.auth.routes.webhook import router as webhook_router
from app.modules.dashboard.routes.dashboard import router as dashboard_router
from app.modules.github.routes.callback import router as github_callback_router
from app.modules.github.routes.prs import router as github_prs_router
from app.modules.github.routes.webhook import router as github_webhook_router
from app.modules.impact.routes.analysis import router as analysis_router
from app.modules.repository.routes.repo import router as repo_router
from app.modules.requirement.routes.req import router as req_router
from app.modules.retrieval.routes.search import router as search_router
from app.modules.review.routes.pr_review import router as pr_review_router
from app.modules.traceability.routes.traceability import router as traceability_router
from app.modules.workspace.routes.workspace import router as workspace_router

logger = logging.getLogger(__name__)


def _run_migrations() -> None:
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Alembic database migrations applied successfully.")
    except Exception as e:
        logger.warning(f"Alembic auto-migration notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.database_url:
        asyncio.create_task(asyncio.to_thread(_run_migrations))
    yield


app = FastAPI(title="TraceIQ API", version="1.0.0", lifespan=lifespan)

cors_origins = list(dict.fromkeys(
    ([settings.frontend_url] if settings.frontend_url else [])
    + (settings.allowed_origins or ["http://localhost:3000", "http://127.0.0.1:3000"])
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
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
app.include_router(workspace_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
