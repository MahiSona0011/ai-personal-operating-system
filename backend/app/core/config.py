from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "AI Personal Operating System"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    BCRYPT_ROUNDS: int = 12

    # Database
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host/db

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # AI
    AI_PROVIDER: str = "anthropic"
    ANTHROPIC_API_KEY: str = ""
    AI_MODEL_FAST: str = "claude-haiku-4-5"
    AI_MODEL_QUALITY: str = "claude-sonnet-4-6"
    AI_MAX_DAILY_CALLS_PER_USER: int = 10

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_BLOB_CONTAINER: str = "user-uploads"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 100


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
