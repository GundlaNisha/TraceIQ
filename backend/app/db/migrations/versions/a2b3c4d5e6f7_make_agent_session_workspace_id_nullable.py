"""Make agent_sessions.workspace_id nullable for personal sessions.

Revision ID: a2b3c4d5e6f7
Revises: f8a9b0c1d2e3
Create Date: 2026-09-30 21:35:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a2b3c4d5e6f7"
down_revision: str | None = "f8a9b0c1d2e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            ALTER TABLE agent_sessions ALTER COLUMN workspace_id DROP NOT NULL;
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM agent_sessions WHERE workspace_id IS NULL;
            ALTER TABLE agent_sessions ALTER COLUMN workspace_id SET NOT NULL;
            """
        )
    )
