from fastapi import APIRouter

from app.routes.repos import router as repos_router
from app.routes.scans import router as scans_router
from app.routes.websocket import router as websocket_router

api_router = APIRouter()

api_router.include_router(scans_router)
api_router.include_router(repos_router)
api_router.include_router(websocket_router)