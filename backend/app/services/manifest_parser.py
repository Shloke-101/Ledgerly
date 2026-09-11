import json
import re
from typing import Any, Dict, List, Optional, Tuple


def _clean_version(value: str) -> str:
    """Cleans semver prefixes and constraint operators."""
    if not value or not isinstance(value, str):
        return "latest"
    value = value.strip()
    value = re.sub(r"^[~^<>=!~^ \t]+", "", value)
    value = value.split()[0] if value else "latest"
    return value if value else "latest"


def parse_package_json(content: str) -> List[Tuple[str, str, str]]:
    """Extracts npm dependencies from package.json content."""
    try:
        data: Dict[str, Any] = json.loads(content)
    except Exception:
        return []

    result = []
    sections = ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies")
    
    for section in sections:
        for name, version in data.get(section, {}).items():
            if isinstance(version, str) and not version.startswith(("git+", "http:", "https:", "file:", "workspace:")):
                result.append((name.strip(), _clean_version(version), "npm"))

    return result


def parse_requirements(content: str) -> List[Tuple[str, str, str]]:
    """Extracts PyPI dependencies from requirements.txt content."""
    result = []

    for line in content.splitlines():
        line = line.strip()

        if not line or line.startswith(("#", "-", "git+", "http:", "https:")):
            continue

        # Strip inline comments
        if " #" in line:
            line = line.split(" #")[0].strip()

        match = re.match(
            r"^([A-Za-z0-9_.-]+)\s*(?:==|===|>=|<=|~=|>|<|!=)?\s*([A-Za-z0-9_.+!-]+)?",
            line,
        )

        if match:
            name = match.group(1).strip()
            version = match.group(2) or "latest"
            if name and not name.startswith((".", "/")):
                result.append((name, _clean_version(version), "PyPI"))

    return result


def parse_pyproject_toml(content: str) -> List[Tuple[str, str, str]]:
    """Extracts PyPI dependencies from pyproject.toml."""
    result = []
    
    # Check dependencies = ["pkg>=1.0", ...]
    dep_array_matches = re.findall(r'dependencies\s*=\s*\[(.*?)\]', content, re.DOTALL)
    for block in dep_array_matches:
        for item in re.findall(r'["\']([^"\']+)["\']', block):
            parts = re.split(r'[=><~^!]', item, 1)
            name = parts[0].strip()
            version = item[len(name):].strip(" =><~^!") if len(parts) > 1 else "latest"
            if name:
                result.append((name, _clean_version(version), "PyPI"))

    # Check poetry style: [tool.poetry.dependencies]
    if "[tool.poetry.dependencies]" in content:
        section = content.split("[tool.poetry.dependencies]")[1].split("[")[0]
        for line in section.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, val = line.split("=", 1)
            name = name.strip().strip('"\'')
            val = val.strip().strip('"\'')
            if name.lower() != "python" and name:
                result.append((name, _clean_version(val), "PyPI"))

    return result


def parse_cargo_toml(content: str) -> List[Tuple[str, str, str]]:
    """Extracts crates.io dependencies from Cargo.toml."""
    result = []
    if "[dependencies]" in content:
        section = content.split("[dependencies]")[1].split("[")[0]
        for line in section.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, val = line.split("=", 1)
            name = name.strip()
            # If table format: serde = { version = "1.0" }
            if "version" in val:
                v_match = re.search(r'version\s*=\s*["\']([^"\']+)["\']', val)
                version = v_match.group(1) if v_match else "latest"
            else:
                version = val.strip().strip('"\'')
            if name:
                result.append((name, _clean_version(version), "crates.io"))
    return result


def parse_go_mod(content: str) -> List[Tuple[str, str, str]]:
    """Extracts Go modules from go.mod."""
    result = []
    # Match require block or single require
    in_require = False
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("require ("):
            in_require = True
            continue
        if in_require and line.startswith(")"):
            in_require = False
            continue
        if in_require or line.startswith("require "):
            cleaned = line.removeprefix("require").strip()
            parts = cleaned.split()
            if len(parts) >= 2:
                name = parts[0]
                version = parts[1]
                result.append((name, _clean_version(version), "Go"))
    return result


def parse_manifests(
    manifest_dict: Optional[Dict[str, str]] = None,
    package_json: Optional[str] = None,
    requirements_txt: Optional[str] = None,
) -> List[Tuple[str, str, str]]:
    """
    Parses all discovered manifest contents and returns a list of unique (name, version, ecosystem).
    """
    result = []

    if manifest_dict:
        for filename, content in manifest_dict.items():
            basename = filename.lower().split("/")[-1]
            if basename == "package.json":
                result.extend(parse_package_json(content))
            elif basename == "requirements.txt" or "requirements" in basename:
                result.extend(parse_requirements(content))
            elif basename == "pyproject.toml":
                result.extend(parse_pyproject_toml(content))
            elif basename == "cargo.toml":
                result.extend(parse_cargo_toml(content))
            elif basename == "go.mod":
                result.extend(parse_go_mod(content))

    if package_json:
        result.extend(parse_package_json(package_json))

    if requirements_txt:
        result.extend(parse_requirements(requirements_txt))

    # Deduplicate while preserving order
    seen = set()
    normalized: List[Tuple[str, str, str]] = []

    for name, version, ecosystem in result:
        key = (name.lower(), version, ecosystem)
        if key not in seen:
            seen.add(key)
            normalized.append((name, version, ecosystem))

    return normalized