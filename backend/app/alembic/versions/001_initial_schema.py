"""initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Try creating pgvector extension if postgres
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    except Exception:
        pass

    op.create_table(
        'repos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('github_url', sa.String(length=500), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('last_scanned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('github_url')
    )

    op.create_table(
        'scans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('repo_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.Enum('pending', 'running', 'completed', 'failed', name='scan_status'), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['repo_id'], ['repos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'dependencies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('package_name', sa.String(length=255), nullable=False),
        sa.Column('version', sa.String(length=100), nullable=False),
        sa.Column('ecosystem', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'vulnerabilities',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dependency_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('osv_id', sa.String(length=255), nullable=False),
        sa.Column('severity', sa.Enum('low', 'medium', 'high', 'critical', name='severity'), nullable=False),
        sa.Column('raw_description', sa.Text(), nullable=False),
        sa.Column('llm_explanation', sa.Text(), nullable=True),
        sa.Column('suggested_fix_version', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['dependency_id'], ['dependencies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('vulnerabilities')
    op.drop_table('dependencies')
    op.drop_table('scans')
    op.drop_table('repos')
