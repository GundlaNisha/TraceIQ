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
    op.add_column(
        "repositories",
        sa.Column(
            "auto_review_prs",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "repositories",
        sa.Column(
            "auto_post_comments",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "repositories",
        sa.Column(
            "default_requirement_id",
            sa.UUID(),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_repositories_default_requirement",
        "repositories",
        "requirements",
        ["default_requirement_id"],
        ["id"],
        ondelete="SET NULL",
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
