"""add is_admin to users

Revision ID: 44af12fa09f8
Revises: 78e0e5687811
Create Date: 2026-09-02 00:23:32.090926

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '44af12fa09f8'
down_revision: Union[str, Sequence[str], None] = '78e0e5687811'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "is_admin")
