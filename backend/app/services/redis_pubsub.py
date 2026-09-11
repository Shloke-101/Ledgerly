import asyncio
import json
import logging
from typing import Any, Callable, Dict, List, Set

from app.config import settings

logger = logging.getLogger(__name__)

# In-memory subscriber registry for standalone mode
_in_memory_subscribers: Dict[str, Set[asyncio.Queue]] = {}


def register_memory_subscriber(scan_id: str) -> asyncio.Queue:
    """Registers an in-memory queue for WebSocket listeners."""
    q: asyncio.Queue = asyncio.Queue()
    if scan_id not in _in_memory_subscribers:
        _in_memory_subscribers[scan_id] = set()
    _in_memory_subscribers[scan_id].add(q)
    return q


def unregister_memory_subscriber(scan_id: str, q: asyncio.Queue):
    """Unregisters an in-memory queue."""
    if scan_id in _in_memory_subscribers:
        _in_memory_subscribers[scan_id].discard(q)
        if not _in_memory_subscribers[scan_id]:
            del _in_memory_subscribers[scan_id]


async def publish_scan_event(scan_id: str, data: Dict[str, Any]):
    """Publishes a scan progress event via Redis and in-memory queues."""
    payload = json.dumps(data)

    # 1. Publish to in-memory queues
    if scan_id in _in_memory_subscribers:
        for q in list(_in_memory_subscribers[scan_id]):
            try:
                await q.put(payload)
            except Exception:
                pass

    # 2. Publish to Redis if configured and reachable
    try:
        import redis.asyncio as redis
        client = redis.from_url(settings.redis_url, socket_connect_timeout=1)
        await client.publish(f"scan:{scan_id}", payload)
        await client.aclose()
    except Exception:
        # Standalone / non-redis mode
        pass