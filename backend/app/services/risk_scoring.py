SEVERITY_WEIGHTS = {
    "low": 8,
    "medium": 20,
    "high": 35,
    "critical": 50,
}


def calculate_risk_score(severities: list[str]) -> int:
    if not severities:
        return 0

    score = sum(SEVERITY_WEIGHTS.get(s.lower(), 0) for s in severities)

    return min(100, score)


def severity_from_osv(vulnerability: dict) -> str:
    severity_entries = vulnerability.get("severity", [])

    for entry in severity_entries:
        score_text = str(entry.get("score", ""))

        try:
            score = float(score_text.split("/")[0])
        except (ValueError, IndexError):
            continue

        if score >= 9:
            return "critical"
        if score >= 7:
            return "high"
        if score >= 4:
            return "medium"
        return "low"

    database_specific = vulnerability.get("database_specific", {})
    severity = str(database_specific.get("severity", "")).lower()

    if severity in {"critical", "high", "medium", "low"}:
        return severity

    return "medium"