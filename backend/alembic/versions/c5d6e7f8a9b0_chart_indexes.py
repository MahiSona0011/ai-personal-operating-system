"""indexes for the chart endpoints

daily_checkins(user_id, checkin_date) and habit_logs(habit_id, log_date) are already indexed by
their unique constraints (uq_checkin_user_date, uq_habit_log_date), so they are not repeated here.

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-10-06 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'c5d6e7f8a9b0'
down_revision: Union[str, None] = 'b4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_metrics_user_area_key_date", "metrics",
        ["user_id", "life_area_id", "metric_key", "metric_date"],
    )
    op.create_index("ix_ai_recommendations_user_created", "ai_recommendations", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_recommendations_user_created", table_name="ai_recommendations")
    op.drop_index("ix_metrics_user_area_key_date", table_name="metrics")
