import asyncio
import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.services.risk_scoring import severity_from_osv

logger = logging.getLogger(__name__)

# In-memory cache fallback if Redis is unavailable
_memory_cache: Dict[str, Any] = {}


class OSVClient:
    def __init__(self):
        self._redis = None
        self._redis_tested = False
        self._redis_available = False

    async def _get_redis(self):
        if not self._redis_tested:
            try:
                import redis.asyncio as redis
                self._redis = redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
                await self._redis.ping()
                self._redis_available = True
            except Exception as e:
                logger.warning(f"Redis not available for OSV cache ({e}). Using in-memory cache.")
                self._redis_available = False
                self._redis = None
            finally:
                self._redis_tested = True
        return self._redis if self._redis_available else None

    async def query(
        self,
        package_name: str,
        version: str,
        ecosystem: str,
    ) -> List[Dict[str, Any]]:
        cache_key = self._cache_key(package_name, version, ecosystem)

        # Check Cache (Redis or Memory)
        r = await self._get_redis()
        if r:
            try:
                cached = await r.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass
        elif cache_key in _memory_cache:
            return _memory_cache[cache_key]

        payload = {
            "package": {
                "name": package_name,
                "ecosystem": ecosystem,
            }
        }
        # Only attach version if it's a specific version
        if version and version != "latest":
            payload["version"] = version

        vulnerabilities = []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://api.osv.dev/v1/query",
                    json=payload,
                )
                if response.status_code == 200:
                    vulnerabilities = response.json().get("vulns", [])
        except Exception as exc:
            logger.error(f"OSV query error for {package_name}@{version}: {exc}")

        # Store in cache
        if r:
            try:
                await r.set(cache_key, json.dumps(vulnerabilities), ex=settings.osv_cache_ttl)
            except Exception:
                _memory_cache[cache_key] = vulnerabilities
        else:
            _memory_cache[cache_key] = vulnerabilities

        return vulnerabilities

    @staticmethod
    def _cache_key(package: str, version: str, ecosystem: str) -> str:
        raw = f"{ecosystem}:{package}:{version}".encode()
        digest = hashlib.sha256(raw).hexdigest()
        return f"previa:osv:{digest}"

    @staticmethod
    def extract_suggested_fix(vulnerability: Dict[str, Any]) -> Optional[str]:
        """Inspects OSV affected ranges to locate the first fixed release version."""
        for affected in vulnerability.get("affected", []):
            for r in affected.get("ranges", []):
                for event in r.get("events", []):
                    if "fixed" in event:
                        return event["fixed"]
        return None

    @classmethod
    def normalize(cls, vulnerability: Dict[str, Any]) -> Dict[str, Any]:
        osv_id = vulnerability.get("id", "UNKNOWN")
        aliases = vulnerability.get("aliases", [])
        cve_id = next((a for a in aliases if a.startswith("CVE-")), None)
        ghsa_id = next((a for a in aliases if a.startswith("GHSA-")), None)

        display_id = cve_id or ghsa_id or osv_id
        summary = vulnerability.get("summary") or ""
        details = vulnerability.get("details") or ""
        description = summary if summary else details if details else "No description available."

        suggested_fix = cls.extract_suggested_fix(vulnerability)

        return {
            "osv_id": osv_id,
            "display_id": display_id,
            "aliases": aliases,
            "severity": severity_from_osv(vulnerability),
            "description": description,
            "summary": summary,
            "suggested_fix_version": suggested_fix,
        }