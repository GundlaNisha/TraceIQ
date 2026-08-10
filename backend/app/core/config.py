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

settings = Settings()
