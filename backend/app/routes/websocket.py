import asyncio
import json
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.services.redis_pubsub import (
    register_memory_subscriber,
    unregister_memory_subscriber,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["realtime"])


@router.websocket("/ws/scans/{scan_id}")
async def scan_websocket_endpoint(
    websocket: WebSocket,
    scan_id: uuid.UUID,
):
    """
    Real-time WebSocket endpoint streaming dependency scan events to the UI.
    Supports both Redis pub/sub and in-process memory queue.
    """
    await websocket.accept()
    scan_id_str = str(scan_id)
    memory_queue = register_memory_subscriber(scan_id_str)

    redis_client = None
    pubsub = None
    use_redis = False

    try:
        import redis.asyncio as redis
        redis_client = redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=1)
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"scan:{scan_id_str}")
        use_redis = True
    except Exception:
        use_redis = False

    try:
        while True:
            # Check in-memory queue first
            try:
                msg_text = memory_queue.get_nowait()
                await websocket.send_text(msg_text)
                try:
                    data = json.loads(msg_text)
                    if data.get("status") in ("completed", "failed"):
                        # Keep connection alive slightly or close
                        await asyncio.sleep(0.5)
                        break
                except Exception:
                    pass
                continue
            except asyncio.QueueEmpty:
                pass

            # Check Redis if active
            if use_redis and pubsub:
                try:
                    msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
                    if msg and msg.get("type") == "message":
                        await websocket.send_text(msg["data"])
                        try:
                            data = json.loads(msg["data"])
                            if data.get("status") in ("completed", "failed"):
                                await asyncio.sleep(0.5)
                                break
                        except Exception:
                            pass
                except Exception:
                    pass

            await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for scan {scan_id_str}")
    except Exception as exc:
        logger.warning(f"WebSocket streaming error for scan {scan_id_str}: {exc}")
    finally:
        unregister_memory_subscriber(scan_id_str, memory_queue)
        if pubsub:
            try:
                await pubsub.unsubscribe(f"scan:{scan_id_str}")
                await pubsub.aclose()
            except Exception:
                pass
        if redis_client:
            try:
                await redis_client.aclose()
            except Exception:
                pass