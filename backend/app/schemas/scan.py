from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, Field

from app.models.scan import ScanStatus


class ScanCreate(BaseModel):
    github_url: str = Field(min_length=1, max_length=500, description="GitHub URL or shorthand owner/repo")


class ScanCreateResponse(BaseModel):
    scan_id: uuid.UUID
    repo_name: str
    github_url: str
    status: ScanStatus


class ScanStatusResponse(BaseModel):
    scan_id: uuid.UUID
    status: ScanStatus
    risk_score: Optional[int] = None
    progress: float = 0.0
    message: Optional[str] = None
    total_dependencies: Optional[int] = None
    vulnerable_count: Optional[int] = None


class VulnerabilitySummary(BaseModel):
    id: uuid.UUID
    osv_id: str
    display_id: Optional[str] = None
    severity: str
    raw_description: str
    llm_explanation: Optional[str] = None
    suggested_fix_version: Optional[str] = None


class DependencyReport(BaseModel):
    id: uuid.UUID
    package_name: str
    version: str
    ecosystem: str
    vulnerabilities: List[VulnerabilitySummary] = []


class RepoSummary(BaseModel):
    id: uuid.UUID
    name: str
    github_url: str
    owner: Optional[str] = None
    last_scanned_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ScanReport(BaseModel):
    scan_id: uuid.UUID
    repo_id: Optional[uuid.UUID] = None
    repo: Optional[Dict[str, Any]] = None
    status: ScanStatus
    risk_score: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_dependencies: int = 0
    vulnerable_dependencies_count: int = 0
    vulnerabilities_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    dependencies: List[DependencyReport] = []


class URLParseResponse(BaseModel):
    is_valid: bool
    owner: str
    repo: str
    normalized_url: str
    display_name: str


class DemoRepo(BaseModel):
    name: str
    owner: str
    github_url: str
    description: str
    language: str
    ecosystem: str
    sample_risk: str