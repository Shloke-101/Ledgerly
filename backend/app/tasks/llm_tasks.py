import asyncio
import uuid

from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models import Vulnerability
from app.services.llm_client import LLMClient


@celery_app.task(name="generate_llm_explanation")
def generate_llm_explanation(vulnerability_id: str):
    return asyncio.run(_generate(vulnerability_id))


async def _generate(vulnerability_id: str):
    async with AsyncSessionLocal() as session:
        vulnerability = await session.get(
            Vulnerability,
            uuid.UUID(vulnerability_id),
        )

        if not vulnerability:
            return

        result = await LLMClient().explain(
            vulnerability.dependency.package_name,
            vulnerability.dependency.version,
            vulnerability.raw_description,
        )

        vulnerability.llm_explanation = result[0]
        vulnerability.suggested_fix_version = result[1]

        embedding = await LLMClient().generate_embedding(
            vulnerability.raw_description
        )

        if embedding:
            vulnerability.description_embedding = embedding

        await session.commit()