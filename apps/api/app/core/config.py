"""
Application Configuration
"""

import os
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # ===========================================
    # General
    # ===========================================
    DEBUG: bool = Field(default=False)
    ENVIRONMENT: str = Field(default="production")
    LOG_LEVEL: str = Field(default="INFO")

    # ===========================================
    # AI Providers
    # ===========================================
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None)
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    LMSTUDIO_URL: str = Field(default="http://localhost:1234/v1")
    LMSTUDIO_ENABLED: bool = Field(default=True)
    OLLAMA_URL: str = Field(default="http://localhost:11434")
    OLLAMA_ENABLED: bool = Field(default=True)

    DEFAULT_AI_PROVIDER: str = Field(default="claude")
    DEFAULT_AI_MODEL: str = Field(default="claude-sonnet-4-5-20250929")

    # AI provider request timeouts (seconds)
    AI_REQUEST_TIMEOUT: int = Field(default=120)
    AI_RETRY_ATTEMPTS: int = Field(default=3)

    # ===========================================
    # Database
    # ===========================================
    DATABASE_URL: str = Field(default="sqlite:///./data/martin_coder.db")

    # ===========================================
    # Redis
    # ===========================================
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # ===========================================
    # Authentication
    # ===========================================
    SECRET_KEY: str = Field(...)  # Required — no default
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)

    FIRST_ADMIN_EMAIL: str = Field(default="admin@example.com")
    FIRST_ADMIN_PASSWORD: str = Field(default="changeme123")

    # Account lockout
    MAX_LOGIN_ATTEMPTS: int = Field(default=5)
    LOCKOUT_DURATION_MINUTES: int = Field(default=15)

    # ===========================================
    # Rate Limiting
    # ===========================================
    RATE_LIMIT_DEFAULT: str = Field(default="60/minute")
    RATE_LIMIT_AUTH: str = Field(default="10/minute")

    # ===========================================
    # CORS
    # ===========================================
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"]
    )

    # ===========================================
    # Sandbox
    # ===========================================
    SANDBOX_ENABLED: bool = Field(default=True)
    SANDBOX_TIMEOUT: int = Field(default=300)
    SANDBOX_MEMORY_LIMIT: str = Field(default="512m")
    SANDBOX_CPU_LIMIT: float = Field(default=1.0)

    # ===========================================
    # RAG
    # ===========================================
    CHROMA_PERSIST_DIRECTORY: str = Field(default="./data/chroma")
    EMBEDDINGS_PROVIDER: str = Field(default="local")
    EMBEDDINGS_MODEL: str = Field(default="all-MiniLM-L6-v2")

    # ===========================================
    # OAuth Providers
    # ===========================================
    # GitHub
    GITHUB_CLIENT_ID: Optional[str] = Field(default=None)
    GITHUB_CLIENT_SECRET: Optional[str] = Field(default=None)

    # Google
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None)

    # ===========================================
    # Server
    # ===========================================
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8000)
    FRONTEND_URL: str = Field(default="http://localhost:3000")

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if v in ("change-me-in-production", "changeme", "secret"):
            raise ValueError(
                "SECRET_KEY must be set to a strong, unique value. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create settings instance
settings = Settings()


def get_available_providers() -> List[str]:
    """Get list of configured AI providers"""
    providers = []

    if settings.ANTHROPIC_API_KEY:
        providers.append("claude")

    if settings.OPENAI_API_KEY:
        providers.append("openai")

    if settings.LMSTUDIO_ENABLED:
        providers.append("lmstudio")

    if settings.OLLAMA_ENABLED:
        providers.append("ollama")

    return providers
