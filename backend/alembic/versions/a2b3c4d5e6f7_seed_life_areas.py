"""seed life areas

Revision ID: a2b3c4d5e6f7
Revises: 9164c9c72a91
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '9164c9c72a91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LIFE_AREAS = [
    (1, 'discipline', 'Discipline', 'shield', '#6366f1', 1),
    (2, 'focus',      'Focus',      'crosshair', '#f59e0b', 2),
    (3, 'learning',   'Learning',   'book-open', '#10b981', 3),
    (4, 'career',     'Career',     'briefcase', '#3b82f6', 4),
    (5, 'health',     'Health',     'heart',     '#ef4444', 5),
    (6, 'mental',     'Mental',     'brain',     '#8b5cf6', 6),
    (7, 'social',     'Social',     'users',     '#ec4899', 7),
    (8, 'financial',  'Financial',  'trending-up','#14b8a6', 8),
]


def upgrade() -> None:
    op.bulk_insert(
        sa.table(
            'life_areas',
            sa.column('id', sa.BigInteger),
            sa.column('slug', sa.String),
            sa.column('name', sa.String),
            sa.column('icon', sa.String),
            sa.column('color_hex', sa.String),
            sa.column('sort_order', sa.SmallInteger),
        ),
        [
            {'id': id_, 'slug': slug, 'name': name, 'icon': icon, 'color_hex': color, 'sort_order': sort}
            for id_, slug, name, icon, color, sort in LIFE_AREAS
        ],
    )
    # Keep the sequence in sync with the manually set IDs
    op.execute("SELECT setval('life_areas_id_seq', 8, true)")


def downgrade() -> None:
    op.execute("DELETE FROM life_areas WHERE slug IN ('discipline','focus','learning','career','health','mental','social','financial')")
