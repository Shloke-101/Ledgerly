import json
import logging
import re
from typing import Optional, Tuple

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self):
        self.api_key = settings.anthropic_api_key.strip() if settings.anthropic_api_key else None
        self.client = (
            anthropic.AsyncAnthropic(api_key=self.api_key)
            if self.api_key
            else None
        )

    async def explain(
        self,
        package_name: str,
        version: str,
        raw_description: str,
        suggested_fix: Optional[str] = None,
    ) -> Tuple[str, Optional[str]]:
        """
        Generates a developer-friendly plain-English explanation of the security vulnerability
        and recommended remediation steps.
        """
        if not self.client:
            return self._generate_heuristic_explanation(package_name, version, raw_description, suggested_fix)

        prompt = f"""You are a supply-chain cybersecurity analyst at Previa.
Explain this dependency vulnerability clearly and concisely for a software developer.

Dependency: {package_name}
Version: {version}
Known OSV Details: {raw_description}
Suggested Fix Version from Advisory: {suggested_fix or 'None specified'}

Return ONLY a JSON object with this exact schema:
{{
  "explanation": "2-3 clear sentences explaining what this vulnerability does, the attack vector, and practical impact.",
  "suggested_fix_version": "{suggested_fix or 'best known safe release or null'}"
}}
"""
        try:
            response = await self.client.messages.create(
                model=settings.anthropic_model,
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
            )

            text = "".join(
                block.text
                for block in response.content
                if getattr(block, "type", None) == "text"
            )

            # Try to parse JSON from the response
            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                return (
                    data.get("explanation", text),
                    data.get("suggested_fix_version") or suggested_fix
                )
            return text, suggested_fix
        except Exception as exc:
            logger.warning(f"Anthropic LLM call failed ({exc}). Using heuristic security explanation.")
            return self._generate_heuristic_explanation(package_name, version, raw_description, suggested_fix)

    @staticmethod
    def _generate_heuristic_explanation(
        package_name: str,
        version: str,
        raw_description: str,
        suggested_fix: Optional[str],
    ) -> Tuple[str, Optional[str]]:
        desc_lower = (raw_description or "").lower()
        vuln_type = "security flaw"
        if "remote code execution" in desc_lower or "rce" in desc_lower:
            vuln_type = "Remote Code Execution (RCE) vulnerability allowing arbitrary code execution"
        elif "sql injection" in desc_lower:
            vuln_type = "SQL Injection flaw allowing database manipulation"
        elif "cross-site scripting" in desc_lower or "xss" in desc_lower:
            vuln_type = "Cross-Site Scripting (XSS) vulnerability"
        elif "prototype pollution" in desc_lower:
            vuln_type = "Prototype Pollution vulnerability that can corrupt application state or lead to denial of service"
        elif "denial of service" in desc_lower or "dos" in desc_lower:
            vuln_type = "Denial of Service (DoS) vulnerability causing resource exhaustion or crash"
        elif "path traversal" in desc_lower or "directory traversal" in desc_lower:
            vuln_type = "Path Traversal vulnerability exposing unauthorized local files"
        elif "buffer overflow" in desc_lower:
            vuln_type = "Buffer Overflow vulnerability potentially leading to memory corruption"

        if suggested_fix:
            explanation = (
                f"{package_name}@{version} contains a {vuln_type}. "
                f"An attacker could exploit this under specific conditions. "
                f"Upgrade immediately to version {suggested_fix} or later to eliminate the risk."
            )
        else:
            explanation = (
                f"{package_name}@{version} is affected by a known {vuln_type}. "
                f"Review the upstream security advisory and update to the latest patched release."
            )

        return explanation, suggested_fix