"""Add Jira OAuth 2.0 (3LO) and dynamic webhook columns to jira_integrations.

Revision ID: f9a1b2c3d4e5
Revises: a2b3c4d5e6f7
Create Date: 2026-11-26 15:12:00.000000

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f9a1b2c3d4e5"
down_revision: str | None = "a2b3c4d5e6f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            ALTER TABLE jira_integrations
            ADD COLUMN IF NOT EXISTS auth_type VARCHAR(32) NOT NULL DEFAULT 'api_token',
            ADD COLUMN IF NOT EXISTS cloud_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
            ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
            ADD COLUMN IF NOT EXISTS oauth_expires_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS oauth_scopes TEXT,
            ADD COLUMN IF NOT EXISTS jira_webhook_id VARCHAR(64),
            ADD COLUMN IF NOT EXISTS webhook_expires_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS webhook_status VARCHAR(32) NOT NULL DEFAULT 'manual';

            ALTER TABLE jira_integrations
            ALTER COLUMN jira_api_token DROP NOT NULL;

            CREATE INDEX IF NOT EXISTS ix_jira_integrations_cloud_id
            ON jira_integrations(cloud_id);
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DROP INDEX IF EXISTS ix_jira_integrations_cloud_id;
            ALTER TABLE jira_integrations
            DROP COLUMN IF EXISTS webhook_status,
            DROP COLUMN IF EXISTS webhook_expires_at,
            DROP COLUMN IF EXISTS jira_webhook_id,
            DROP COLUMN IF EXISTS oauth_scopes,
            DROP COLUMN IF EXISTS oauth_expires_at,
            DROP COLUMN IF EXISTS oauth_refresh_token,
            DROP COLUMN IF EXISTS oauth_access_token,
            DROP COLUMN IF EXISTS cloud_id,
            DROP COLUMN IF EXISTS auth_type;
            """
        )
    )
