import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

logger = logging.getLogger(__name__)

app = FastAPI(title="TraceIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
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
app.include_router(dashboard_router)
app.include_router(github_callback_router)
app.include_router(github_webhook_router)
app.include_router(github_prs_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
