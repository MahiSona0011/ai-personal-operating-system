"""journal entries: ai_status

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-10-06 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e7f8a9b0c1d2'
down_revision: Union[str, None] = 'd6e7f8a9b0c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("journal_entries", sa.Column("ai_status", sa.String(20), nullable=True))
    # Entries that already carry an analysis are complete; the rest were never analysed.
    op.execute("UPDATE journal_entries SET ai_status = 'completed' WHERE ai_summary IS NOT NULL")


def downgrade() -> None:
    op.drop_column("journal_entries", "ai_status")
