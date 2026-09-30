import os
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

    # AI & Embeddings Multi-Provider Architecture (Gemini, OpenCode Zen, Groq)
    openai_api_key: str = ""
    openai_api_base: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini/gemini-2.5-flash"
    google_api_key: str = ""

    # OpenCode Zen (https://opencode.ai/zen/v1)
    opencode_api_key: str = ""
    opencode_base_url: str = "https://opencode.ai/zen/v1"
    opencode_model: str = "openai/zen-v1"
    zen_api_key: str = ""

    # Groq (https://api.groq.com/openai/v1)
    groq_api_key: str = ""
    groq_model: str = "groq/llama-3.3-70b-versatile"

    # Multi-Provider Routing Strategy ("round_robin" or "priority")
    ai_strategy: str = "round_robin"
    ai_provider_order: str = "gemini,opencode,groq"
    ai_provider_cooldown_seconds: int = 60

    llm_base_url: str = ""
    llm_model: str = ""
    embedding_model: str = ""
    embedding_dimensions: int = 384

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
    frontend_url: str = ""
    # Comma-separated list or JSON array of allowed CORS origins
    allowed_origins: str | list[str] = []

    # Snapshot storage — path where repo tarballs are written by repo_sync
    snapshot_dir: str = "data/snapshots"

    # Celery & Background Task Execution Mode
    use_celery: bool = False
    celery_always_eager: bool | None = None
    celery_task_soft_time_limit: int = 600  # 10 min warning
    celery_task_time_limit: int = 900  # 15 min hard kill

    @property
    def is_celery_eager(self) -> bool:
        """Determines if Celery executes in eager (in-process) mode or distributed worker queue mode.

        Only local/development environments can use distributed Celery worker queues;
        production strictly executes in-process directly.
        """
        if self.environment == "production":
            return True
        if self.celery_always_eager is not None:
            return self.celery_always_eager
        return not self.use_celery

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
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
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
        return []


settings = Settings()
if settings.gemini_api_key and "GEMINI_API_KEY" not in os.environ:
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
if settings.google_api_key and "GOOGLE_API_KEY" not in os.environ:
    os.environ["GOOGLE_API_KEY"] = settings.google_api_key
if settings.groq_api_key and "GROQ_API_KEY" not in os.environ:
    os.environ["GROQ_API_KEY"] = settings.groq_api_key
if settings.opencode_api_key and "OPENCODE_API_KEY" not in os.environ:
    os.environ["OPENCODE_API_KEY"] = settings.opencode_api_key
