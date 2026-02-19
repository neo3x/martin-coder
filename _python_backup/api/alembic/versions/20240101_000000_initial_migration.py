"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('username', sa.String(100), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_superuser', sa.Boolean(), default=False),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('default_ai_provider', sa.String(50), default='claude'),
        sa.Column('default_ai_model', sa.String(100), default='claude-sonnet-4-5-20250929'),
        sa.Column('anthropic_api_key', sa.Text(), nullable=True),
        sa.Column('openai_api_key', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_login', sa.DateTime(), nullable=True),
    )

    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('local_path', sa.String(500), nullable=True),
        sa.Column('git_url', sa.String(500), nullable=True),
        sa.Column('git_branch', sa.String(100), default='main'),
        sa.Column('detected_language', sa.String(50), nullable=True),
        sa.Column('detected_framework', sa.String(100), nullable=True),
        sa.Column('project_type', sa.String(50), nullable=True),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_indexed', sa.Boolean(), default=False),
        sa.Column('last_indexed_at', sa.DateTime(), nullable=True),
        sa.Column('owner_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create project_files table
    op.create_table(
        'project_files',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('path', sa.String(500), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('extension', sa.String(50), nullable=True),
        sa.Column('language', sa.String(50), nullable=True),
        sa.Column('content_hash', sa.String(64), nullable=True),
        sa.Column('size_bytes', sa.Integer(), default=0),
        sa.Column('line_count', sa.Integer(), default=0),
        sa.Column('symbols', sa.JSON(), nullable=True),
        sa.Column('imports', sa.JSON(), nullable=True),
        sa.Column('is_indexed', sa.Boolean(), default=False),
        sa.Column('embedding_id', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create chats table
    op.create_table(
        'chats',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(255), default='New Chat'),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ai_provider', sa.String(50), default='claude'),
        sa.Column('ai_model', sa.String(100), default='claude-sonnet-4-5-20250929'),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('context_files', sa.JSON(), nullable=True),
        sa.Column('message_count', sa.Integer(), default=0),
        sa.Column('total_tokens', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('chat_id', sa.String(36), sa.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.Enum('USER', 'ASSISTANT', 'SYSTEM', 'TOOL', name='messagerole'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tool_calls', sa.JSON(), nullable=True),
        sa.Column('tool_call_id', sa.String(100), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), default=0),
        sa.Column('completion_tokens', sa.Integer(), default=0),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # Create indexes
    op.create_index('ix_projects_owner_id', 'projects', ['owner_id'])
    op.create_index('ix_project_files_project_id', 'project_files', ['project_id'])
    op.create_index('ix_chats_user_id', 'chats', ['user_id'])
    op.create_index('ix_chats_project_id', 'chats', ['project_id'])
    op.create_index('ix_messages_chat_id', 'messages', ['chat_id'])


def downgrade() -> None:
    op.drop_table('messages')
    op.drop_table('chats')
    op.drop_table('project_files')
    op.drop_table('projects')
    op.drop_table('users')
    op.execute('DROP TYPE IF EXISTS messagerole')
