from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TraceIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

from app.modules.auth.routes.auth import router as auth_router
from app.modules.repository.routes.repo import router as repo_router
from app.modules.retrieval.routes.search import router as search_router

app.include_router(auth_router)
app.include_router(repo_router)
app.include_router(search_router)
