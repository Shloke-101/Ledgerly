import asyncio
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Dependency, Repo, Scan, ScanStatus, Vulnerability
from app.schemas.scan import (
    DependencyReport,
    ScanCreate,
    ScanCreateResponse,
    ScanReport,
    ScanStatusResponse,
    VulnerabilitySummary,
)
from app.services.github_client import GitHubError, parse_github_url
from app.tasks.scan_tasks import run_scan_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.post("", response_model=ScanCreateResponse)
async def create_scan(
    payload: ScanCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new repository scan job.
    Accepts any GitHub URL or 'owner/repo' shorthand.
    Executes asynchronously with in-process background worker.
    """
    try:
        owner, repo_name = parse_github_url(payload.github_url)
    except GitHubError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid GitHub URL: {str(exc)}")

    normalized_url = f"https://github.com/{owner}/{repo_name}"

    try:
        # Find or create Repo
        repo = await db.scalar(
            select(Repo).where(Repo.github_url == normalized_url)
        )

        if not repo:
            repo = Repo(
                github_url=normalized_url,
                name=f"{owner}/{repo_name}",
            )
            db.add(repo)
            await db.flush()

        scan = Scan(
            repo_id=repo.id,
            status=ScanStatus.pending,
        )
        db.add(scan)
        await db.commit()
        await db.refresh(scan)

        scan_id_str = str(scan.id)

        # Dispatch background async pipeline immediately
        background_tasks.add_task(run_scan_pipeline, scan_id_str)

        return ScanCreateResponse(
            scan_id=scan.id,
            repo_name=repo.name,
            github_url=repo.github_url,
            status=scan.status,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Error creating scan: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate repository scan: {str(exc)}",
        )


@router.get("/{scan_id}", response_model=ScanStatusResponse)
async def get_scan_status(
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves real-time status and high-level progress of a scan."""
    scan = await db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan job not found.")

    total_deps = await db.scalar(
        select(func.count(Dependency.id)).where(Dependency.scan_id == scan.id)
    ) or 0

    vulnerable_deps = await db.scalar(
        select(func.count(func.distinct(Vulnerability.dependency_id)))
        .join(Dependency, Vulnerability.dependency_id == Dependency.id)
        .where(Dependency.scan_id == scan.id)
    ) or 0

    progress = 100.0 if scan.status == ScanStatus.completed else 50.0 if scan.status == ScanStatus.running else 10.0

    return ScanStatusResponse(
        scan_id=scan.id,
        status=scan.status,
        risk_score=scan.risk_score,
        progress=progress,
        total_dependencies=total_deps,
        vulnerable_count=vulnerable_deps,
    )


@router.get("/{scan_id}/report", response_model=ScanReport)
async def get_scan_report(
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves the complete vulnerability and risk analysis report for a scan."""
    result = await db.execute(
        select(Scan)
        .options(
            selectinload(Scan.repo),
            selectinload(Scan.dependencies).selectinload(Dependency.vulnerabilities),
        )
        .where(Scan.id == scan_id)
    )
    scan = result.scalar_one_or_none()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan report not found.")

    if scan.status == ScanStatus.failed:
        raise HTTPException(
            status_code=400,
            detail="The repository scan failed during execution. Please verify the repository is accessible and try again."
        )

    if scan.status in (ScanStatus.pending, ScanStatus.running):
        raise HTTPException(
            status_code=409,
            detail="Scan is still in progress. Please wait for completion."
        )

    dependencies_report: list[DependencyReport] = []
    total_vulns = 0
    critical_cnt = 0
    high_cnt = 0
    medium_cnt = 0
    low_cnt = 0
    vulnerable_deps_count = 0

    for dep in scan.dependencies:
        vuln_summaries = []
        if dep.vulnerabilities:
            vulnerable_deps_count += 1

        for v in dep.vulnerabilities:
            total_vulns += 1
            sev = v.severity.value.lower()
            if sev == "critical":
                critical_cnt += 1
            elif sev == "high":
                high_cnt += 1
            elif sev == "medium":
                medium_cnt += 1
            else:
                low_cnt += 1

            vuln_summaries.append(
                VulnerabilitySummary(
                    id=v.id,
                    osv_id=v.osv_id,
                    display_id=v.osv_id,
                    severity=v.severity.value,
                    raw_description=v.raw_description,
                    llm_explanation=v.llm_explanation,
                    suggested_fix_version=v.suggested_fix_version,
                )
            )

        dependencies_report.append(
            DependencyReport(
                id=dep.id,
                package_name=dep.package_name,
                version=dep.version,
                ecosystem=dep.ecosystem,
                vulnerabilities=vuln_summaries,
            )
        )

    repo_data = None
    if scan.repo:
        repo_data = {
            "id": str(scan.repo.id),
            "name": scan.repo.name,
            "github_url": scan.repo.github_url,
            "last_scanned_at": scan.repo.last_scanned_at.isoformat() if scan.repo.last_scanned_at else None,
        }

    return ScanReport(
        scan_id=scan.id,
        repo_id=scan.repo_id,
        repo=repo_data,
        status=scan.status,
        risk_score=scan.risk_score or 0,
        started_at=scan.started_at,
        completed_at=scan.completed_at,
        total_dependencies=len(scan.dependencies),
        vulnerable_dependencies_count=vulnerable_deps_count,
        vulnerabilities_count=total_vulns,
        critical_count=critical_cnt,
        high_count=high_cnt,
        medium_count=medium_cnt,
        low_count=low_cnt,
        dependencies=dependencies_report,
    )