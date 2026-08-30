"""Add jira_integrations table and jira fields to requirements

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-30 14:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: str | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Create jira_integrations table
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS jira_integrations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
                user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                jira_domain VARCHAR(512) NOT NULL,
                jira_email VARCHAR(255) NOT NULL,
                jira_api_token TEXT NOT NULL,
                default_project_key VARCHAR(64),
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            """
        )
    )

    conn.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_jira_integrations_workspace_id ON jira_integrations(workspace_id);
            CREATE INDEX IF NOT EXISTS ix_jira_integrations_user_id ON jira_integrations(user_id);
            """
        )
    )

    # 2. Add Jira fields to requirements table
    conn.execute(
        sa.text(
            """
            ALTER TABLE requirements
            ADD COLUMN IF NOT EXISTS jira_issue_key VARCHAR(64),
            ADD COLUMN IF NOT EXISTS jira_issue_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS jira_issue_url VARCHAR(512),
            ADD COLUMN IF NOT EXISTS jira_status VARCHAR(64),
            ADD COLUMN IF NOT EXISTS jira_priority VARCHAR(64),
            ADD COLUMN IF NOT EXISTS jira_issue_type VARCHAR(64),
            ADD COLUMN IF NOT EXISTS jira_synced_at TIMESTAMP WITH TIME ZONE;
            """
        )
    )

    conn.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_requirements_jira_issue_key ON requirements(jira_issue_key);
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        sa.text(
            """
            DROP INDEX IF EXISTS ix_requirements_jira_issue_key;
            ALTER TABLE requirements
            DROP COLUMN IF EXISTS jira_synced_at,
            DROP COLUMN IF EXISTS jira_issue_type,
            DROP COLUMN IF EXISTS jira_priority,
            DROP COLUMN IF EXISTS jira_status,
            DROP COLUMN IF EXISTS jira_issue_url,
            DROP COLUMN IF EXISTS jira_issue_id,
            DROP COLUMN IF EXISTS jira_issue_key;
            DROP TABLE IF EXISTS jira_integrations CASCADE;
            """
        )
    )
