import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_title: str = "PREVIA API"
    api_version: str = "1.0.0"
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("PORT", os.getenv("API_PORT", "8000")))
    
    # Defaults to local SQLite for instant zero-config startup, or PostgreSQL if configured
    database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./previa.db")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model: str = "claude-3-5-sonnet-latest"
    github_token: str = os.getenv("GITHUB_TOKEN", "")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    cors_origins: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173"
    )

    osv_cache_ttl: int = 86400
    osv_rate_limit_seconds: float = 0.25

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def normalized_database_url(self) -> str:
        """Ensures SQLAlchemy asyncpg dialect is used for PostgreSQL URLs provided by cloud hosts like Render."""
        url = self.database_url
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.cors_origins or self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()