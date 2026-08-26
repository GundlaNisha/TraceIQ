"""add workspace tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-24 18:47:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()

    # Workspace role enum
    conn.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspacerole') THEN
                    CREATE TYPE workspacerole AS ENUM ('owner', 'admin', 'member', 'viewer');
                END IF;
            END
            $$;
            """
        )
    )

    # workspaces table
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                created_by VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )

    # workspace_members table
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS workspace_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role workspacerole NOT NULL DEFAULT 'member',
                invited_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT uq_workspace_members UNIQUE (workspace_id, user_id)
            )
            """
        )
    )

    # workspace_invitations table
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS workspace_invitations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                email VARCHAR(320) NOT NULL,
                role workspacerole NOT NULL DEFAULT 'member',
                token VARCHAR(64) NOT NULL UNIQUE,
                invited_by VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                accepted_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )

    # Indexes
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_workspace_members_user ON workspace_members (user_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_workspace_members_workspace ON workspace_members (workspace_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_workspace_invitations_token ON workspace_invitations (token)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_workspace_invitations_workspace ON workspace_invitations (workspace_id)"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS workspace_invitations"))
    conn.execute(sa.text("DROP TABLE IF EXISTS workspace_members"))
    conn.execute(sa.text("DROP TABLE IF EXISTS workspaces"))
    conn.execute(sa.text("DROP TYPE IF EXISTS workspacerole"))
