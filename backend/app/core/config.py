from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Cloudflare R2
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_endpoint_url: str = ""

    # OpenAI
    openai_api_key: str = ""
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
    # Comma-separated list of allowed CORS origins; defaults to localhost dev
    allowed_origins: list[str] = ["http://localhost:3000"]

    # Snapshot storage — path where repo tarballs are written by repo_sync
    snapshot_dir: str = "data/snapshots"

    # Celery task timeouts (seconds)
    celery_task_soft_time_limit: int = 600   # 10 min warning
    celery_task_time_limit: int = 900         # 15 min hard kill


settings = Settings()
