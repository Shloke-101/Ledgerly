import base64
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple
import urllib.parse

import httpx

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
GITHUB_RAW = "https://raw.githubusercontent.com"


class GitHubError(Exception):
    """Custom exception for GitHub API and parsing errors."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def parse_github_url(raw_input: str) -> Tuple[str, str]:
    """
    Parses any common GitHub URL or shorthand into (owner, repo).
    
    Supported formats:
      - https://github.com/owner/repo
      - http://github.com/owner/repo
      - https://www.github.com/owner/repo
      - github.com/owner/repo
      - www.github.com/owner/repo
      - git@github.com:owner/repo.git
      - owner/repo
      - URLs with query params, hash fragments, .git extensions, trailing slashes.
    """
    if not raw_input or not isinstance(raw_input, str):
        raise GitHubError("GitHub URL cannot be empty.", status_code=422)

    cleaned = raw_input.strip()

    # Remove git+ prefix or trailing quotes
    cleaned = re.sub(r"^(git\+|git://)", "", cleaned)
    cleaned = cleaned.strip("\"' \t\n\r")

    # If it's an SSH style URL: git@github.com:owner/repo(.git)
    ssh_match = re.match(r"^git@github\.com:([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(?:\.git)?/?$", cleaned)
    if ssh_match:
        owner, repo = ssh_match.group(1), ssh_match.group(2)
        return owner, repo.removesuffix(".git")

    # If it starts with http/https or github.com
    if not cleaned.startswith(("http://", "https://")):
        if cleaned.startswith("github.com/") or cleaned.startswith("www.github.com/"):
            cleaned = f"https://{cleaned}"
        elif "/" in cleaned and not cleaned.startswith("/") and len(cleaned.split("/")) == 2:
            # Short form: owner/repo
            parts = cleaned.split("/")
            owner = parts[0].strip()
            repo = parts[1].strip().removesuffix(".git")
            if owner and repo and re.match(r"^[a-zA-Z0-9_.-]+$", owner) and re.match(r"^[a-zA-Z0-9_.-]+$", repo):
                return owner, repo
            raise GitHubError(f"Invalid repository shorthand: '{raw_input}'. Expected 'owner/repo'.", status_code=422)
        else:
            cleaned = f"https://github.com/{cleaned}"

    try:
        parsed = urllib.parse.urlparse(cleaned)
    except Exception:
        raise GitHubError(f"Unable to parse URL: '{raw_input}'", status_code=422)

    hostname = (parsed.hostname or "").lower()
    if hostname not in ("github.com", "www.github.com"):
        raise GitHubError(
            f"Invalid host '{hostname}'. Only GitHub repositories (github.com) are supported.",
            status_code=422
        )

    # Path should be /owner/repo/...
    path_segments = [seg for seg in parsed.path.strip("/").split("/") if seg]
    if len(path_segments) < 2:
        raise GitHubError(
            f"Invalid GitHub URL '{raw_input}'. Expected 'https://github.com/owner/repository'.",
            status_code=422
        )

    owner = path_segments[0].strip()
    repo = path_segments[1].strip().removesuffix(".git")

    if not owner or not repo or not re.match(r"^[a-zA-Z0-9_.-]+$", owner) or not re.match(r"^[a-zA-Z0-9_.-]+$", repo):
        raise GitHubError(
            f"Invalid owner '{owner}' or repository name '{repo}'.",
            status_code=422
        )

    return owner, repo


class GitHubClient:
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN", "").strip()
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Previa-Security-Scanner/1.0",
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    async def _request(
        self,
        client: httpx.AsyncClient,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        raise_on_404: bool = True,
    ) -> Optional[Any]:
        url = f"{GITHUB_API}{endpoint}" if endpoint.startswith("/") else endpoint
        try:
            response = await client.get(
                url,
                headers=self.headers,
                params=params,
                timeout=15.0,
            )
        except httpx.RequestError as exc:
            raise GitHubError(f"Unable to connect to GitHub API: {str(exc)}", status_code=503)

        if response.status_code == 404:
            if raise_on_404:
                raise GitHubError(
                    "Repository not found. Verify the owner and repository name, or ensure the repository is public.",
                    status_code=404
                )
            return None

        if response.status_code == 401:
            raise GitHubError("GitHub API authorization failed. Check your GITHUB_TOKEN.", status_code=401)

        if response.status_code == 403:
            msg = response.json().get("message", "") if response.headers.get("content-type", "").startswith("application/json") else ""
            if "rate limit" in msg.lower() or "secondary rate limit" in msg.lower():
                raise GitHubError(
                    "GitHub API rate limit reached. Please configure a valid GITHUB_TOKEN in your environment.",
                    status_code=429
                )
            raise GitHubError(f"GitHub access forbidden: {msg or 'Access denied'}", status_code=403)

        if response.status_code >= 400:
            try:
                error_data = response.json()
                msg = error_data.get("message", f"GitHub request failed with HTTP {response.status_code}")
            except Exception:
                msg = f"GitHub request failed with HTTP {response.status_code}"
            raise GitHubError(msg, status_code=response.status_code)

        try:
            return response.json()
        except Exception:
            return response.text

    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetches full repository metadata, languages, branches, commits, and topics."""
        async with httpx.AsyncClient() as client:
            try:
                repo_data = await self._request(client, f"/repos/{owner}/{repo}")
            except GitHubError as e:
                # If rate limited on metadata endpoint, provide fallback metadata so scan proceeds!
                if e.status_code in (403, 429):
                    logger.warning(f"GitHub metadata rate limited for {owner}/{repo}. Using fallback metadata.")
                    return {
                        "id": None,
                        "name": repo,
                        "owner": {
                            "login": owner,
                            "avatar_url": f"https://github.com/{owner}.png",
                            "html_url": f"https://github.com/{owner}",
                        },
                        "full_name": f"{owner}/{repo}",
                        "description": "Public GitHub Repository",
                        "html_url": f"https://github.com/{owner}/{repo}",
                        "clone_url": f"https://github.com/{owner}/{repo}.git",
                        "default_branch": "main",
                        "private": False,
                        "fork": False,
                        "stars": 0,
                        "forks": 0,
                        "open_issues": 0,
                        "watchers": 0,
                        "size": 0,
                        "language": "Multi-language",
                        "languages": {},
                        "topics": [],
                        "license": "Open Source",
                        "created_at": None,
                        "updated_at": None,
                        "pushed_at": None,
                        "branches": [{"name": "main", "protected": False}, {"name": "master", "protected": False}],
                        "commits": [],
                    }
                raise

            # Secondary fetches
            languages = {}
            try:
                languages = await self._request(client, f"/repos/{owner}/{repo}/languages", raise_on_404=False) or {}
            except Exception:
                pass

            branches = []
            try:
                branches_res = await self._request(client, f"/repos/{owner}/{repo}/branches", params={"per_page": 5}, raise_on_404=False) or []
                branches = [
                    {
                        "name": b.get("name"),
                        "protected": b.get("protected", False),
                    }
                    for b in branches_res if isinstance(b, dict)
                ]
            except Exception:
                pass

            commits = []
            try:
                commits_res = await self._request(client, f"/repos/{owner}/{repo}/commits", params={"per_page": 5}, raise_on_404=False) or []
                for c in commits_res:
                    if isinstance(c, dict):
                        commit_obj = c.get("commit", {})
                        author_obj = c.get("author") or {}
                        commits.append({
                            "sha": c.get("sha", "")[:7],
                            "full_sha": c.get("sha", ""),
                            "message": commit_obj.get("message", "").split("\n")[0],
                            "author": author_obj.get("login") or commit_obj.get("author", {}).get("name", "Unknown"),
                            "date": commit_obj.get("author", {}).get("date"),
                        })
            except Exception:
                pass

            return {
                "id": repo_data.get("id"),
                "name": repo_data.get("name"),
                "owner": {
                    "login": repo_data.get("owner", {}).get("login"),
                    "avatar_url": repo_data.get("owner", {}).get("avatar_url"),
                    "html_url": repo_data.get("owner", {}).get("html_url"),
                },
                "full_name": repo_data.get("full_name"),
                "description": repo_data.get("description") or "No description provided.",
                "html_url": repo_data.get("html_url"),
                "clone_url": repo_data.get("clone_url"),
                "default_branch": repo_data.get("default_branch", "main"),
                "private": repo_data.get("private", False),
                "fork": repo_data.get("fork", False),
                "stars": repo_data.get("stargazers_count", 0),
                "forks": repo_data.get("forks_count", 0),
                "open_issues": repo_data.get("open_issues_count", 0),
                "watchers": repo_data.get("watchers_count", 0),
                "size": repo_data.get("size", 0),
                "language": repo_data.get("language") or "Other",
                "languages": languages,
                "topics": repo_data.get("topics", []),
                "license": (repo_data.get("license") or {}).get("name") or "No license",
                "created_at": repo_data.get("created_at"),
                "updated_at": repo_data.get("updated_at"),
                "pushed_at": repo_data.get("pushed_at"),
                "branches": branches,
                "commits": commits,
            }

    async def get_from_url(self, url: str) -> Dict[str, Any]:
        owner, repo = parse_github_url(url)
        return await self.get_repository(owner, repo)

    async def fetch_file_content(self, owner: str, repo: str, file_path: str, branch: Optional[str] = None) -> Optional[str]:
        """Fetches raw text content using raw.githubusercontent.com (unmetered) with API fallback."""
        branches_to_try = [branch] if branch else []
        for b in ["main", "master", "develop", "dev"]:
            if b not in branches_to_try:
                branches_to_try.append(b)

        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Try raw.githubusercontent.com directly across common branches
            for b in branches_to_try:
                raw_url = f"{GITHUB_RAW}/{owner}/{repo}/{b}/{file_path}"
                try:
                    res = await client.get(raw_url, headers=self.headers)
                    if res.status_code == 200 and res.text.strip():
                        return res.text
                except Exception:
                    pass

            # 2. Try Contents API if raw returned 404 or failed
            try:
                params = {"ref": branch} if branch else {}
                data = await self._request(client, f"/repos/{owner}/{repo}/contents/{file_path}", params=params, raise_on_404=False)
                if isinstance(data, dict) and data.get("encoding") == "base64" and "content" in data:
                    return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            except Exception:
                pass

            return None

    async def fetch_manifests(self, repo_url_or_owner_repo: str) -> Dict[str, str]:
        """Fetches dependency manifest files from the repository."""
        if "/" in repo_url_or_owner_repo and not repo_url_or_owner_repo.startswith(("http://", "https://", "github.com", "www.github.com")):
            parts = repo_url_or_owner_repo.split("/")
            owner, repo = parts[0], parts[1].removesuffix(".git")
        else:
            owner, repo = parse_github_url(repo_url_or_owner_repo)

        default_branch = "main"
        try:
            repo_info = await self.get_repository(owner, repo)
            default_branch = repo_info.get("default_branch", "main")
        except Exception:
            pass

        manifest_paths = [
            "package.json",
            "package-lock.json",
            "requirements.txt",
            "Pipfile",
            "pyproject.toml",
            "go.mod",
            "Cargo.toml",
            "pom.xml",
            "frontend/package.json",
            "backend/requirements.txt",
            "backend/pyproject.toml",
            "server/package.json",
            "client/package.json",
            "app/package.json",
            "api/requirements.txt",
        ]

        manifests: Dict[str, str] = {}

        for path in manifest_paths:
            content = await self.fetch_file_content(owner, repo, path, branch=default_branch)
            if content and content.strip():
                manifests[path] = content

        return manifests


github_client = GitHubClient()