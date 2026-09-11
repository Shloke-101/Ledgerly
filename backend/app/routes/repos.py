from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Repo, Scan
from app.schemas.scan import DemoRepo, RepoSummary, URLParseResponse
from app.services.github_client import GitHubError, github_client, parse_github_url

router = APIRouter(
    prefix="/api/repos",
    tags=["repositories"],
)


class RepositoryRequest(BaseModel):
    github_url: str


DEMO_REPOSITORIES = [
    DemoRepo(
        name="Previa",
        owner="Shloke-101",
        github_url="https://github.com/Shloke-101/Previa",
        description="Dependency vulnerability scanner and security intelligence platform",
        language="TypeScript / Python",
        ecosystem="npm + PyPI",
        sample_risk="Verified",
    ),
    DemoRepo(
        name="express",
        owner="expressjs",
        github_url="https://github.com/expressjs/express",
        description="Fast, unopinionated, minimalist web framework for Node.js",
        language="JavaScript",
        ecosystem="npm",
        sample_risk="Popular",
    ),
    DemoRepo(
        name="flask",
        owner="pallets",
        github_url="https://github.com/pallets/flask",
        description="The Python micro framework for building web applications",
        language="Python",
        ecosystem="PyPI",
        sample_risk="Standard",
    ),
    DemoRepo(
        name="requests",
        owner="psf",
        github_url="https://github.com/psf/requests",
        description="A simple, yet elegant, HTTP library for Python",
        language="Python",
        ecosystem="PyPI",
        sample_risk="Secure",
    ),
    DemoRepo(
        name="next.js",
        owner="vercel",
        github_url="https://github.com/vercel/next.js",
        description="The React Framework for the Web",
        language="TypeScript",
        ecosystem="npm",
        sample_risk="Enterprise",
    ),
]


@router.post("/parse", response_model=URLParseResponse)
async def parse_repository_url(payload: RepositoryRequest):
    """Parses and validates any GitHub URL format without making API calls."""
    try:
        owner, repo = parse_github_url(payload.github_url)
        return URLParseResponse(
            is_valid=True,
            owner=owner,
            repo=repo,
            normalized_url=f"https://github.com/{owner}/{repo}",
            display_name=f"{owner}/{repo}",
        )
    except GitHubError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unable to parse GitHub repository URL: {str(exc)}",
        )


@router.post("/fetch")
async def fetch_repository(payload: RepositoryRequest):
    """Validates URL and fetches full GitHub repository details."""
    try:
        owner, repo = parse_github_url(payload.github_url)
        repository = await github_client.get_repository(owner, repo)

        return {
            "success": True,
            "owner": owner,
            "repo": repo,
            "repository": repository,
        }
    except GitHubError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to fetch repository: {str(exc)}",
        )


@router.get("/demo", response_model=List[DemoRepo])
async def get_demo_repositories():
    """Returns curated demo repositories ready for instant testing."""
    return DEMO_REPOSITORIES


@router.get("", response_model=List[RepoSummary])
async def list_repositories(
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Lists recently scanned repositories stored in the database."""
    try:
        result = await db.execute(
            select(Repo)
            .order_by(desc(Repo.created_at))
            .limit(limit)
        )
        repos = result.scalars().all()
        return [
            RepoSummary(
                id=r.id,
                name=r.name,
                github_url=r.github_url,
                owner=r.github_url.split("github.com/")[-1].split("/")[0] if "github.com/" in r.github_url else None,
                last_scanned_at=r.last_scanned_at,
                created_at=r.created_at,
            )
            for r in repos
        ]
    except Exception:
        return []


@router.get("/{owner}/{repo}")
async def get_repository_by_owner_and_name(owner: str, repo: str):
    """Direct lookup for owner/repo from GitHub API."""
    try:
        repository = await github_client.get_repository(owner, repo)
        return {
            "success": True,
            "repository": repository,
        }
    except GitHubError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving repository: {str(exc)}",
        )