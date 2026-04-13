"""add account tables

Revision ID: 001
Revises:
Create Date: 2026-04-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('user_id', sa.String(40), nullable=False),
        sa.Column('user_type', sa.String(3), nullable=False),
        sa.Column('status', sa.String(10), nullable=False, server_default='active'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('user_id')
    )

    # Create user_profile table
    op.create_table('user_profile',
        sa.Column('user_id', sa.String(40), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('nickname', sa.String(50), nullable=True),
        sa.Column('birthday', sa.Date(), nullable=True),
        sa.Column('profile_img_url', sa.Text(), nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
        sa.UniqueConstraint('email', name='uq_email')
    )

    # Create user_security table
    op.create_table('user_security',
        sa.Column('user_id', sa.String(40), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=True),
        sa.Column('last_login_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('login_fail_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('locked_until', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )

    # Create user_oauth table
    op.create_table('user_oauth',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(40), nullable=False),
        sa.Column('provider', sa.String(5), nullable=False),
        sa.Column('provider_sub', sa.String(255), nullable=False),
        sa.Column('linked_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider', 'provider_sub', name='uq_oauth_provider_sub')
    )

    # Create user_preference table
    op.create_table('user_preference',
        sa.Column('user_id', sa.String(40), nullable=False),
        sa.Column('travel_style', sa.String(50), nullable=True),
        sa.Column('transport_type', sa.String(50), nullable=True),
        sa.Column('preferred_food', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('schedule_density', sa.String(20), nullable=True),
        sa.Column('companion_type', sa.String(30), nullable=True),
        sa.Column('personalized_topics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ui_settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )

    # Create auth_tokens table
    op.create_table('auth_tokens',
        sa.Column('token_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('token_type', sa.String(20), nullable=False),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('used_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('token_id')
    )

    # Create refresh_tokens table
    op.create_table('refresh_tokens',
        sa.Column('token_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(40), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('revoked_at', postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('token_id')
    )


def downgrade() -> None:
    op.drop_table('refresh_tokens')
    op.drop_table('auth_tokens')
    op.drop_table('user_preference')
    op.drop_table('user_oauth')
    op.drop_table('user_security')
    op.drop_table('user_profile')
    op.drop_table('users')
