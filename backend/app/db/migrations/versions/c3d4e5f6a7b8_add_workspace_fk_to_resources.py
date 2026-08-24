"""add workspace_id to repositories and requirements

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-24 19:05:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Add nullable workspace_id to repositories
    conn.execute(
        sa.text(
            """
            ALTER TABLE repositories
            ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;
            """
        )
    )
    conn.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_repositories_workspace'
                ) THEN
                    ALTER TABLE repositories
                    ADD CONSTRAINT fk_repositories_workspace
                    FOREIGN KEY (workspace_id)
                    REFERENCES workspaces(id)
                    ON DELETE SET NULL;
                END IF;
            END
            $$;
            """
        )
    )
    conn.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_repositories_workspace_id ON repositories (workspace_id);"
        )
    )

    # Add nullable workspace_id to requirements
    conn.execute(
        sa.text(
            """
            ALTER TABLE requirements
            ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;
            """
        )
    )
    conn.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_requirements_workspace'
                ) THEN
                    ALTER TABLE requirements
                    ADD CONSTRAINT fk_requirements_workspace
                    FOREIGN KEY (workspace_id)
                    REFERENCES workspaces(id)
                    ON DELETE SET NULL;
                END IF;
            END
            $$;
            """
        )
    )
    conn.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_requirements_workspace_id ON requirements (workspace_id);"
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE repositories DROP CONSTRAINT IF EXISTS fk_repositories_workspace"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_repositories_workspace_id"))
    conn.execute(sa.text("ALTER TABLE repositories DROP COLUMN IF EXISTS workspace_id"))

    conn.execute(sa.text("ALTER TABLE requirements DROP CONSTRAINT IF EXISTS fk_requirements_workspace"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_requirements_workspace_id"))
    conn.execute(sa.text("ALTER TABLE requirements DROP COLUMN IF EXISTS workspace_id"))
