import os
from typing import Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_env = os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "development")).lower()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            ".env",
            f".env.{_env}",
            ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Environment
    environment: str = _env

    # Database
    database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Cloudflare R2
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_endpoint_url: str = ""

    # OpenAI / LLM
    openai_api_key: str = ""
    openai_api_base: str = ""
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    # Auth
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    clerk_jwks_url: str = ""
    clerk_webhook_secret: str = ""

    # GitHub App
    github_app_id: str = ""
    github_private_key: str = ""
    github_webhook_secret: str = ""

    # Deployment
    frontend_url: str = "http://localhost:3000"
    # Comma-separated list or JSON array of allowed CORS origins; defaults to localhost dev
    allowed_origins: Union[str, list[str]] = ["http://localhost:3000"]

    # Snapshot storage — path where repo tarballs are written by repo_sync
    snapshot_dir: str = "data/snapshots"

    # Celery task timeouts (seconds)
    celery_task_soft_time_limit: int = 600  # 10 min warning
    celery_task_time_limit: int = 900  # 15 min hard kill

    @field_validator("database_url", mode="after")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if not v:
            return v
        # Ensure driver is specified for SQLAlchemy async engine
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("allowed_origins", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, list[str]]) -> list[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                import json
                try:
                    parsed = json.loads(v_stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if item]
                except Exception:
                    pass
            return [i.strip() for i in v_stripped.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i).strip() for i in v if i]
        return ["http://localhost:3000"]


settings = Settings()
