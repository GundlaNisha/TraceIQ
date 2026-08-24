"""add_repository_settings

Revision ID: 82fa4173d19a
Revises: 61e333750bfd
Create Date: 2026-08-21 12:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "82fa4173d19a"
down_revision: str | None = "61e333750bfd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Use raw SQL with IF NOT EXISTS so this is safe to run even if the columns
    # already exist (e.g. on Render where the DB was partially migrated manually).
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "ALTER TABLE repositories "
            "ADD COLUMN IF NOT EXISTS auto_review_prs BOOLEAN NOT NULL DEFAULT false"
        )
    )
    conn.execute(
        sa.text(
            "ALTER TABLE repositories "
            "ADD COLUMN IF NOT EXISTS auto_post_comments BOOLEAN NOT NULL DEFAULT false"
        )
    )
    conn.execute(
        sa.text(
            "ALTER TABLE repositories "
            "ADD COLUMN IF NOT EXISTS default_requirement_id UUID NULL"
        )
    )
    # Add FK only if it doesn't already exist
    conn.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_repositories_default_requirement'
                ) THEN
                    ALTER TABLE repositories
                    ADD CONSTRAINT fk_repositories_default_requirement
                    FOREIGN KEY (default_requirement_id)
                    REFERENCES requirements(id)
                    ON DELETE SET NULL;
                END IF;
            END
            $$;
            """
        )
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_repositories_default_requirement",
        "repositories",
        type_="foreignkey",
    )
    op.drop_column("repositories", "default_requirement_id")
    op.drop_column("repositories", "auto_post_comments")
    op.drop_column("repositories", "auto_review_prs")
