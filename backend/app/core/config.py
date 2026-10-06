from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "Selfstack"
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
    AI_BATCH_DELAY_SECONDS: float = 2.0  # pause between users in the weekly batch

    # Shared secret the scheduler sends in x-digest-secret. Empty disables the scheduler endpoints.
    DIGEST_SECRET: str = ""

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_BLOB_CONTAINER: str = "user-uploads"

    # Where emailed links point (password reset, email verification)
    FRONTEND_URL: str = "http://localhost:3000"

    # Email (Resend)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Selfstack <noreply@aipos.app>"

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    RATE_LIMIT_AI_PER_MINUTE: int = 5
    RATE_LIMIT_FORGOT_PASSWORD_PER_HOUR: int = 3
    RATE_LIMIT_VERIFY_EMAIL_PER_HOUR: int = 3

    @model_validator(mode="after")
    def _refuse_placeholder_secrets_in_production(self) -> "Settings":
        # A placeholder signing key (the .env.example or docker-compose default) would let anyone forge tokens.
        if self.ENVIRONMENT == "production":
            key = self.SECRET_KEY
            if len(key) < 32 or key.lower().startswith(("change-me", "local-dev")):
                raise ValueError(
                    "SECRET_KEY must be a real random value of at least 32 characters when ENVIRONMENT=production "
                    "(generate one with: openssl rand -hex 32)"
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
