"""six life areas

Collapses the 8 self-rated areas into 6: Health, Mind, Relationships, Work, Money, Growth.
Discipline and Focus stop being self-rated areas (they become measured signals) and fold into Work.

Revision ID: b4c5d6e7f8a9
Revises: a2b3c4d5e6f7
Create Date: 2026-10-06 00:00:00.000000

Upgrade
  * life_areas rows are replaced by the 6 new ones (ids 1-6).
  * habits / goals / sessions / metrics / ai_recommendations are remapped to the new ids.
  * daily_checkins gets score_mind/relationships/work/money/growth; Work is the rounded mean of the old
    Career + Focus + Discipline scores. The original 8 scores are kept in `legacy_area_scores` (JSON),
    then the old score_* columns are dropped.
  * journal_entries.life_area_tags and weekly_reviews.avg_scores are remapped to the new slugs.

Downgrade restores the 8 original life_areas rows with their original ids and the old score columns
(from `legacy_area_scores` where present). It is lossy in one place: rows that were folded into Work
(Focus / Discipline habits, goals, sessions, metrics) come back as Career, because the merge discarded
which of the three they were.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JSON_T = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")

OLD_AREAS = [
    (1, "discipline", "Discipline", "shield", "#6366f1", 1),
    (2, "focus", "Focus", "crosshair", "#f59e0b", 2),
    (3, "learning", "Learning", "book-open", "#10b981", 3),
    (4, "career", "Career", "briefcase", "#3b82f6", 4),
    (5, "health", "Health", "heart", "#ef4444", 5),
    (6, "mental", "Mental", "brain", "#8b5cf6", 6),
    (7, "social", "Social", "users", "#ec4899", 7),
    (8, "financial", "Financial", "trending-up", "#14b8a6", 8),
]
NEW_AREAS = [
    (1, "health", "Health", "heart", "#EF4343", 1),
    (2, "mind", "Mind", "brain", "#F59F0A", 2),
    (3, "relationships", "Relationships", "users", "#EC4699", 3),
    (4, "work", "Work", "briefcase", "#21C45D", 4),
    (5, "money", "Money", "wallet", "#21CAB9", 5),
    (6, "growth", "Growth", "sprout", "#3EBAF4", 6),
]

# old id -> new id
ID_MAP = {1: 4, 2: 4, 3: 6, 4: 4, 5: 1, 6: 2, 7: 3, 8: 5}
# new id -> old id used when downgrading (Work folds back to Career)
REVERSE_ID_MAP = {1: 5, 2: 6, 3: 7, 4: 4, 5: 8, 6: 3}
# old slug -> new slug
SLUG_MAP = {
    "discipline": "work", "focus": "work", "career": "work", "learning": "growth",
    "health": "health", "mental": "mind", "social": "relationships", "financial": "money",
}
REVERSE_SLUG_MAP = {"health": "health", "mind": "mental", "relationships": "social",
                    "work": "career", "money": "financial", "growth": "learning"}

OLD_SCORE_COLS = ["score_discipline", "score_focus", "score_learning", "score_career",
                  "score_mental", "score_social", "score_financial"]  # score_health is kept as-is
NEW_SCORE_COLS = ["score_mind", "score_relationships", "score_work", "score_money", "score_growth"]

# tables holding a life_area_id foreign key
FK_TABLES = ["habits", "goals", "sessions", "metrics", "ai_recommendations"]

_areas = sa.table(
    "life_areas",
    sa.column("id", sa.BigInteger), sa.column("slug", sa.String), sa.column("name", sa.String),
    sa.column("icon", sa.String), sa.column("color_hex", sa.String), sa.column("sort_order", sa.SmallInteger),
)


def _rows(rows):
    return [dict(id=i, slug=s, name=n, icon=ic, color_hex=c, sort_order=o) for i, s, n, ic, c, o in rows]


def _remap_fk(conn, mapping: dict[int, int]) -> None:
    """Point every life_area_id foreign key at its mapped id, in one statement per table."""
    case = "CASE life_area_id " + " ".join(f"WHEN {k} THEN {v}" for k, v in mapping.items()) + " ELSE life_area_id END"
    for table in FK_TABLES:
        conn.execute(sa.text(f"UPDATE {table} SET life_area_id = {case} WHERE life_area_id IS NOT NULL"))


def _swap_areas(conn, new_rows, mapping: dict[int, int]) -> None:
    """Replace the life_areas rows with `new_rows` and remap foreign keys by `mapping`.

    Old and new ids overlap (1-8 vs 1-6) and slugs are unique, so go through a staging id range
    (+100) with temporary slugs, then land on the final ids/slugs.
    """
    conn.execute(sa.text("UPDATE life_areas SET slug = 'old_' || slug"))
    staged = [(i + 100, f"stg_{s}", n, ic, c, o) for i, s, n, ic, c, o in new_rows]
    conn.execute(sa.insert(_areas), _rows(staged))
    _remap_fk(conn, {old: new + 100 for old, new in mapping.items()})
    conn.execute(sa.text("DELETE FROM life_areas WHERE id < 100"))
    conn.execute(sa.insert(_areas), _rows([(i, f"tmp_{s}", n, ic, c, o) for i, s, n, ic, c, o in new_rows]))
    _remap_fk(conn, {i + 100: i for i, *_ in new_rows})
    conn.execute(sa.text("DELETE FROM life_areas WHERE id > 100"))
    for i, s, *_ in new_rows:
        conn.execute(sa.text("UPDATE life_areas SET slug = :s WHERE id = :i"), {"s": s, "i": i})
    if conn.dialect.name == "postgresql":
        conn.execute(sa.text("SELECT setval('life_areas_id_seq', (SELECT MAX(id) FROM life_areas), true)"))


def _mean_round(values: list):
    vals = [v for v in values if v is not None]
    # round half up, so a 6.5 becomes 7 rather than banker's-rounding to 6
    return int(sum(vals) / len(vals) + 0.5) if vals else None


def _remap_slug_list(tags):
    if not tags:
        return tags
    out: list = []
    for t in tags:
        new = SLUG_MAP.get(t, t)
        if new not in out:
            out.append(new)
    return out


def _remap_scores_dict(d, mapping: dict[str, str]):
    """Average score dicts keyed by area slug; merged areas store the mean."""
    if not isinstance(d, dict):
        return d
    buckets: dict[str, list] = {}
    for k, v in d.items():
        buckets.setdefault(mapping.get(k, k), []).append(v)
    out = {}
    for k, vs in buckets.items():
        nums = [x for x in vs if isinstance(x, (int, float))]
        out[k] = round(sum(nums) / len(nums), 1) if nums else vs[0]
    return out


def upgrade() -> None:
    conn = op.get_bind()

    # --- check-in scores -------------------------------------------------------------------------
    op.add_column("daily_checkins", sa.Column("legacy_area_scores", JSON_T, nullable=True))
    for col in NEW_SCORE_COLS:
        op.add_column("daily_checkins", sa.Column(col, sa.SmallInteger(), nullable=True))

    checkins = sa.table(
        "daily_checkins",
        sa.column("id", sa.BigInteger), sa.column("legacy_area_scores", JSON_T),
        *[sa.column(c, sa.SmallInteger) for c in OLD_SCORE_COLS + ["score_health"] + NEW_SCORE_COLS],
    )
    for row in conn.execute(sa.select(checkins)).mappings().all():
        legacy = {c.removeprefix("score_"): row[c] for c in OLD_SCORE_COLS + ["score_health"]}
        conn.execute(
            sa.update(checkins).where(checkins.c.id == row["id"]).values(
                legacy_area_scores=legacy,
                score_mind=row["score_mental"],
                score_relationships=row["score_social"],
                score_money=row["score_financial"],
                score_growth=row["score_learning"],
                score_work=_mean_round([row["score_career"], row["score_focus"], row["score_discipline"]]),
            )
        )
    with op.batch_alter_table("daily_checkins") as batch:
        for col in OLD_SCORE_COLS:
            batch.drop_column(col)

    # --- life areas + foreign keys ---------------------------------------------------------------
    _swap_areas(conn, NEW_AREAS, ID_MAP)

    # --- slug-keyed JSON -------------------------------------------------------------------------
    journals = sa.table("journal_entries", sa.column("id", sa.BigInteger), sa.column("life_area_tags", JSON_T))
    for row in conn.execute(sa.select(journals.c.id, journals.c.life_area_tags)).all():
        if row.life_area_tags:
            conn.execute(sa.update(journals).where(journals.c.id == row.id)
                         .values(life_area_tags=_remap_slug_list(row.life_area_tags)))
    reviews = sa.table("weekly_reviews", sa.column("id", sa.BigInteger), sa.column("avg_scores", JSON_T))
    for row in conn.execute(sa.select(reviews.c.id, reviews.c.avg_scores)).all():
        conn.execute(sa.update(reviews).where(reviews.c.id == row.id)
                     .values(avg_scores=_remap_scores_dict(row.avg_scores, SLUG_MAP)))


def downgrade() -> None:
    conn = op.get_bind()

    # --- life areas + foreign keys ---------------------------------------------------------------
    _swap_areas(conn, OLD_AREAS, REVERSE_ID_MAP)

    # --- slug-keyed JSON (lossy: Work comes back as career) --------------------------------------
    journals = sa.table("journal_entries", sa.column("id", sa.BigInteger), sa.column("life_area_tags", JSON_T))
    for row in conn.execute(sa.select(journals.c.id, journals.c.life_area_tags)).all():
        if row.life_area_tags:
            tags = [REVERSE_SLUG_MAP.get(t, t) for t in row.life_area_tags]
            conn.execute(sa.update(journals).where(journals.c.id == row.id).values(life_area_tags=tags))
    reviews = sa.table("weekly_reviews", sa.column("id", sa.BigInteger), sa.column("avg_scores", JSON_T))
    for row in conn.execute(sa.select(reviews.c.id, reviews.c.avg_scores)).all():
        conn.execute(sa.update(reviews).where(reviews.c.id == row.id)
                     .values(avg_scores=_remap_scores_dict(row.avg_scores, REVERSE_SLUG_MAP)))

    # --- check-in scores -------------------------------------------------------------------------
    for col in OLD_SCORE_COLS:
        op.add_column("daily_checkins", sa.Column(col, sa.SmallInteger(), nullable=True))
    checkins = sa.table(
        "daily_checkins",
        sa.column("id", sa.BigInteger), sa.column("legacy_area_scores", JSON_T),
        *[sa.column(c, sa.SmallInteger) for c in OLD_SCORE_COLS + ["score_health"] + NEW_SCORE_COLS],
    )
    for row in conn.execute(sa.select(checkins)).mappings().all():
        legacy = row["legacy_area_scores"]
        if legacy:  # exact restore
            values = {f"score_{k}": v for k, v in legacy.items() if f"score_{k}" in OLD_SCORE_COLS}
        else:  # check-in created after the migration: best-effort mapping back
            values = {
                "score_mental": row["score_mind"], "score_social": row["score_relationships"],
                "score_financial": row["score_money"], "score_learning": row["score_growth"],
                "score_career": row["score_work"],
            }
        conn.execute(sa.update(checkins).where(checkins.c.id == row["id"]).values(**values))
    with op.batch_alter_table("daily_checkins") as batch:
        for col in NEW_SCORE_COLS + ["legacy_area_scores"]:
            batch.drop_column(col)
