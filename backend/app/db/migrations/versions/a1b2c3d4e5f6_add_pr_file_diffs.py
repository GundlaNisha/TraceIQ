"""add pr_file_diffs table

Revision ID: a1b2c3d4e5f6
Revises: 82fa4173d19a
Create Date: 2026-08-23 18:22:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "82fa4173d19a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS pr_file_diffs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                pr_review_id UUID NOT NULL REFERENCES pr_reviews(id) ON DELETE CASCADE,
                file_path VARCHAR(1024) NOT NULL,
                patch TEXT NOT NULL,
                additions INTEGER NOT NULL DEFAULT 0,
                deletions INTEGER NOT NULL DEFAULT 0
            )
            """
        )
    )
    conn.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_pr_file_diffs_review_id "
            "ON pr_file_diffs (pr_review_id)"
        )
    )



def downgrade() -> None:
    op.drop_index("ix_pr_file_diffs_review_id", table_name="pr_file_diffs")
    op.drop_table("pr_file_diffs")
