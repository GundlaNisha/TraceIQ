"""add index optimization

Revision ID: 895ddd914ffb
Revises: c33d652cbc2e
Create Date: 2026-08-08 14:47:40.676423

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '895ddd914ffb'
down_revision: Union[str, Sequence[str], None] = 'c33d652cbc2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE INDEX IF NOT EXISTS idx_repo_files_repo_snap ON repository_files (repository_id, snapshot_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_code_symbols_name ON code_symbols (symbol_name);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs (status);")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS idx_repo_files_repo_snap;")
    op.execute("DROP INDEX IF EXISTS idx_code_symbols_name;")
    op.execute("DROP INDEX IF EXISTS idx_analysis_jobs_status;")
