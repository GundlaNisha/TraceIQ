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
    op.create_table(
        "pr_file_diffs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("pr_review_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("pr_reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("patch", sa.Text(), nullable=False),
        sa.Column("additions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("deletions", sa.Integer(), server_default="0", nullable=False),
        if_not_exists=True,
    )
    op.create_index(
        "ix_pr_file_diffs_review_id",
        "pr_file_diffs",
        ["pr_review_id"],
        if_not_exists=True,
    )



def downgrade() -> None:
    op.drop_index("ix_pr_file_diffs_review_id", table_name="pr_file_diffs")
    op.drop_table("pr_file_diffs")
