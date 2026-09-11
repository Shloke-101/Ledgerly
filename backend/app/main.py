from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text

from app.config import settings
from app.database import engine, init_db
from app.routes.repos import router as repos_router
from app.routes.scans import router as scans_router
from app.routes.websocket import router as websocket_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("previa")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database schema if available
    logger.info("Starting PREVIA API server...")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down PREVIA API server...")
    try:
        await engine.dispose()
    except Exception:
        pass


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="PREVIA - High-Performance Dependency Vulnerability & Security Intelligence Platform",
    lifespan=lifespan,
)

# CORS configuration
origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_origin_regex=r"https?://.*" if origins == ["*"] else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(repos_router)
app.include_router(scans_router)
app.include_router(websocket_router)

# Aliases for direct /scans and /repos routes to prevent any legacy 404s
app.include_router(scans_router, prefix="")
app.include_router(repos_router, prefix="")

# Mount Static Vanilla HTML/CSS/JS Frontend
static_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/app")
    async def serve_vanilla_app():
        index_file = static_dir / "index.html"
        return FileResponse(str(index_file))


@app.get("/")
async def root():
    # If static frontend exists, serve it at root as well or return JSON
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "name": "PREVIA Security Intelligence API",
        "status": "online",
        "version": settings.api_version,
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint checking system, database, and redis status."""
    db_status = "unknown"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception as e:
        db_status = f"unavailable ({type(e).__name__})"

    redis_status = "unknown"
    try:
        import redis.asyncio as redis
        client = redis.from_url(settings.redis_url, socket_connect_timeout=1)
        await client.ping()
        await client.aclose()
        redis_status = "connected"
    except Exception:
        redis_status = "standalone_mode"

    return {
        "status": "ok",
        "service": "previa-api",
        "version": settings.api_version,
        "database": db_status,
        "redis": redis_status,
    }