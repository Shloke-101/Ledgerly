import logging
from sqlalchemy import MetaData, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    metadata = MetaData()


engine = create_async_engine(
    settings.normalized_database_url,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Initializes tables on startup if database is available."""
    try:
        async with engine.begin() as conn:
            # Try enabling pgvector if postgres
            if "postgresql" in settings.database_url:
                try:
                    await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                except Exception as ext_err:
                    logger.warning(f"Could not enable pgvector extension: {ext_err}")
            
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database schema initialized successfully.")
    except Exception as exc:
        logger.warning(f"Database auto-initialization skipped or encountered an error ({exc}).")