import asyncio
from datetime import datetime, timezone
import logging
import uuid
from typing import Optional

from sqlalchemy import delete, select

from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models import Dependency, Repo, Scan, ScanStatus, Severity, Vulnerability
from app.services.github_client import GitHubClient, GitHubError
from app.services.llm_client import LLMClient
from app.services.manifest_parser import parse_manifests
from app.services.osv_client import OSVClient
from app.services.redis_pubsub import publish_scan_event
from app.services.risk_scoring import calculate_risk_score

logger = logging.getLogger(__name__)


async def run_scan_pipeline(scan_id_str: str):
    """
    Executes the complete scan pipeline asynchronously:
    1. Fetches repository manifests via GitHub API
    2. Parses dependencies across npm, PyPI, Cargo, Go, etc.
    3. Queries OSV.dev database for each dependency
    4. Enriches vulnerabilities with AI explanations & remediation versions
    5. Computes overall repository risk score
    6. Updates database and streams progress via WebSocket
    """
    scan_id = uuid.UUID(scan_id_str)
    llm = LLMClient()
    osv = OSVClient()
    gh = GitHubClient()

    async with AsyncSessionLocal() as session:
        scan = await session.get(Scan, scan_id)
        if not scan:
            logger.error(f"Scan {scan_id} not found in database.")
            return

        repo = await session.get(Repo, scan.repo_id)
        if not repo:
            logger.error(f"Repo for scan {scan_id} not found.")
            return

        scan.status = ScanStatus.running
        scan.started_at = datetime.now(timezone.utc)

        # Clear any old dependencies for re-scans
        await session.execute(
            delete(Dependency).where(Dependency.scan_id == scan.id)
        )
        await session.commit()

        await publish_scan_event(
            scan_id_str,
            {
                "package_name": "__system__",
                "status": "connecting",
                "message": f"Connecting to GitHub for {repo.name}...",
                "progress": 10,
            }
        )

        try:
            # 1. Fetch manifests
            manifests = await gh.fetch_manifests(repo.github_url)
            
            await publish_scan_event(
                scan_id_str,
                {
                    "package_name": "__system__",
                    "status": "parsing",
                    "message": f"Found {len(manifests)} manifest file(s). Extracting dependencies...",
                    "progress": 25,
                }
            )

            dependencies_list = parse_manifests(manifest_dict=manifests)

            if not dependencies_list:
                # No dependency manifests detected
                scan.status = ScanStatus.completed
                scan.risk_score = 0
                scan.completed_at = datetime.now(timezone.utc)
                repo.last_scanned_at = datetime.now(timezone.utc)
                await session.commit()

                await publish_scan_event(
                    scan_id_str,
                    {
                        "package_name": "__scan__",
                        "status": "completed",
                        "risk_score": 0,
                        "message": "No dependencies or manifest files found.",
                        "total_dependencies": 0,
                        "vulnerable_count": 0,
                        "progress": 100,
                    }
                )
                return

            # 2. Persist dependencies
            dep_records = []
            for pkg_name, version, ecosystem in dependencies_list:
                dep = Dependency(
                    scan_id=scan.id,
                    package_name=pkg_name,
                    version=version,
                    ecosystem=ecosystem,
                )
                session.add(dep)
                dep_records.append(dep)

            await session.commit()

            total_deps = len(dep_records)
            vulnerable_severities = []
            total_vulns_count = 0

            # 3. Scan each dependency against OSV
            for idx, dep in enumerate(dep_records):
                progress_pct = 30 + int((idx / max(total_deps, 1)) * 50)
                await publish_scan_event(
                    scan_id_str,
                    {
                        "package_name": dep.package_name,
                        "version": dep.version,
                        "ecosystem": dep.ecosystem,
                        "status": "scanning",
                        "progress": progress_pct,
                    }
                )

                raw_vulns = await osv.query(dep.package_name, dep.version, dep.ecosystem)
                dep_severities = []

                for item in raw_vulns:
                    normalized = osv.normalize(item)
                    sev_str = normalized["severity"]
                    dep_severities.append(sev_str)
                    vulnerable_severities.append(sev_str)
                    total_vulns_count += 1

                    # Generate AI explanation & suggested fix
                    explanation, fix_ver = await llm.explain(
                        dep.package_name,
                        dep.version,
                        normalized["description"],
                        suggested_fix=normalized.get("suggested_fix_version"),
                    )

                    # Map to Severity enum
                    sev_enum = getattr(Severity, sev_str, Severity.medium)

                    vuln_row = Vulnerability(
                        dependency_id=dep.id,
                        osv_id=normalized["osv_id"],
                        severity=sev_enum,
                        raw_description=normalized["description"],
                        llm_explanation=explanation,
                        suggested_fix_version=fix_ver,
                    )
                    session.add(vuln_row)

                await session.commit()

                # Status update for this package
                status_label = "vulnerable" if raw_vulns else "clean"
                highest_sev = None
                if dep_severities:
                    highest_sev = max(
                        dep_severities,
                        key=lambda x: {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(x, 0)
                    )

                await publish_scan_event(
                    scan_id_str,
                    {
                        "package_name": dep.package_name,
                        "version": dep.version,
                        "ecosystem": dep.ecosystem,
                        "status": status_label,
                        "severity": highest_sev,
                        "vuln_count": len(raw_vulns),
                        "progress": progress_pct,
                    }
                )

            # 4. Finalize Scan & Compute Risk Score
            risk_score = calculate_risk_score(vulnerable_severities)
            scan.risk_score = risk_score
            scan.status = ScanStatus.completed
            scan.completed_at = datetime.now(timezone.utc)
            repo.last_scanned_at = datetime.now(timezone.utc)
            await session.commit()

            await publish_scan_event(
                scan_id_str,
                {
                    "package_name": "__scan__",
                    "status": "completed",
                    "risk_score": risk_score,
                    "total_dependencies": total_deps,
                    "vulnerable_count": total_vulns_count,
                    "progress": 100,
                }
            )

        except Exception as exc:
            logger.exception(f"Scan pipeline failed for {scan_id}: {exc}")
            scan.status = ScanStatus.failed
            await session.commit()
            await publish_scan_event(
                scan_id_str,
                {
                    "package_name": "__scan__",
                    "status": "failed",
                    "error": str(exc),
                    "progress": 100,
                }
            )


@celery_app.task(name="start_scan")
def start_scan(scan_id: str):
    """Celery worker task entry point."""
    return asyncio.run(run_scan_pipeline(scan_id))