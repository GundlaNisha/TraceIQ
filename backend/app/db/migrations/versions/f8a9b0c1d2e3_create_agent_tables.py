"""Create agent tables for sessions, messages, and action approvals.

Revision ID: f8a9b0c1d2e3
Revises: e6f7a8b9c0d1
Create Date: 2026-09-27 21:40:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f8a9b0c1d2e3"
down_revision: str | None = "e6f7a8b9c0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. agent_sessions table
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS agent_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
                requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL DEFAULT 'New Agent Session',
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                current_phase VARCHAR(50) NOT NULL DEFAULT 'exploring',
                context_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_agent_sessions_workspace_id ON agent_sessions(workspace_id);
            CREATE INDEX IF NOT EXISTS ix_agent_sessions_user_id ON agent_sessions(user_id);
            CREATE INDEX IF NOT EXISTS ix_agent_sessions_user_workspace ON agent_sessions(workspace_id, user_id);
            CREATE INDEX IF NOT EXISTS ix_agent_sessions_status ON agent_sessions(status);
            CREATE INDEX IF NOT EXISTS ix_agent_sessions_repo ON agent_sessions(repository_id);
            CREATE INDEX IF NOT EXISTS ix_agent_sessions_req ON agent_sessions(requirement_id);
            """
        )
    )

    # 2. agent_messages table
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS agent_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
                sender VARCHAR(50) NOT NULL,
                agent_role VARCHAR(50),
                content TEXT NOT NULL DEFAULT '',
                message_type VARCHAR(50) NOT NULL DEFAULT 'text',
                artifacts JSONB NOT NULL DEFAULT '{}'::jsonb,
                tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_agent_messages_session_id ON agent_messages(session_id);
            CREATE INDEX IF NOT EXISTS ix_agent_messages_session_created ON agent_messages(session_id, created_at);
            """
        )
    )

    # 3. agent_action_approvals table
    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS agent_action_approvals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
                message_id UUID REFERENCES agent_messages(id) ON DELETE CASCADE,
                action_type VARCHAR(100) NOT NULL,
                payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                user_feedback TEXT,
                decided_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
                decided_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_agent_approvals_session_id ON agent_action_approvals(session_id);
            CREATE INDEX IF NOT EXISTS ix_agent_approvals_session_status ON agent_action_approvals(session_id, status);
            CREATE INDEX IF NOT EXISTS ix_agent_approvals_message_id ON agent_action_approvals(message_id);
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DROP TABLE IF EXISTS agent_action_approvals;
            DROP TABLE IF EXISTS agent_messages;
            DROP TABLE IF EXISTS agent_sessions;
            """
        )
    )
