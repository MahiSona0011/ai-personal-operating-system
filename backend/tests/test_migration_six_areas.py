"""Migration b4c5d6e7f8a9 (8 life areas -> 6) against a real Postgres, with one row per old area."""
import asyncio
import json
import os

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

PG_URL = os.environ.get("TEST_POSTGRES_URL")
pytestmark = [
    pytest.mark.postgres,
    pytest.mark.skipif(not PG_URL, reason="TEST_POSTGRES_URL not set"),
]

BEFORE, AFTER = "a2b3c4d5e6f7", "b4c5d6e7f8a9"
OLD = {1: "discipline", 2: "focus", 3: "learning", 4: "career", 5: "health", 6: "mental", 7: "social", 8: "financial"}
EXPECTED_NEW = {1: "health", 2: "mind", 3: "relationships", 4: "work", 5: "money", 6: "growth"}
# old life_area_id -> expected new life_area_id
REMAP = {1: 4, 2: 4, 3: 6, 4: 4, 5: 1, 6: 2, 7: 3, 8: 5}
FK_TABLES = ["habits", "goals", "sessions", "metrics", "ai_recommendations"]


def _run(coro_fn):
    async def go():
        engine = create_async_engine(PG_URL)
        try:
            async with engine.begin() as conn:
                return await coro_fn(conn)
        finally:
            await engine.dispose()
    return asyncio.run(go())


def _alembic(action, rev, monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", PG_URL)
    root = os.path.join(os.path.dirname(__file__), "..")
    cfg = Config(os.path.join(root, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(root, "alembic"))
    getattr(command, action)(cfg, rev)


async def _reset(conn):
    await conn.execute(sa.text("DROP SCHEMA public CASCADE"))
    await conn.execute(sa.text("CREATE SCHEMA public"))


async def _seed_old_data(conn):
    uid = (await conn.execute(sa.text(
        "INSERT INTO users (email, full_name, timezone, onboarding_state, is_active) "
        "VALUES ('m@example.com', 'M', 'UTC', 'complete', true) RETURNING id"))).scalar_one()
    for old_id in OLD:
        p = {"u": uid, "a": old_id, "t": f"row for {OLD[old_id]}"}
        await conn.execute(sa.text(
            "INSERT INTO habits (user_id, life_area_id, title, frequency, target_count, current_streak, "
            "longest_streak, total_completions, is_active) VALUES (:u, :a, :t, 'daily', 1, 0, 0, 0, true)"), p)
        await conn.execute(sa.text(
            "INSERT INTO goals (user_id, life_area_id, title, status, priority, progress_pct) "
            "VALUES (:u, :a, :t, 'active', 1, 0)"), p)
        await conn.execute(sa.text(
            "INSERT INTO sessions (user_id, life_area_id, session_type, title, started_at) "
            "VALUES (:u, :a, 'deep_work', :t, now())"), p)
        await conn.execute(sa.text(
            "INSERT INTO metrics (user_id, life_area_id, metric_key, metric_date) VALUES (:u, :a, 'k', current_date)"), p)
        await conn.execute(sa.text(
            "INSERT INTO ai_recommendations (user_id, life_area_id, recommendation_type, model_used, raw_response, "
            "is_dismissed, is_actioned) VALUES (:u, :a, 'on_demand', 'm', '{}', false, false)"), p)
    # three check-ins: all areas rated, only some rated, none rated
    await conn.execute(sa.text(
        "INSERT INTO daily_checkins (user_id, checkin_date, is_complete, score_discipline, score_focus, score_learning, "
        "score_career, score_health, score_mental, score_social, score_financial) "
        "VALUES (:u, '2026-10-01', true, 6, 8, 5, 7, 9, 4, 3, 2)"), {"u": uid})
    await conn.execute(sa.text(
        "INSERT INTO daily_checkins (user_id, checkin_date, is_complete, score_focus, score_career, score_mental) "
        "VALUES (:u, '2026-10-02', true, 5, 6, 7)"), {"u": uid})
    await conn.execute(sa.text(
        "INSERT INTO daily_checkins (user_id, checkin_date, is_complete) VALUES (:u, '2026-10-03', false)"), {"u": uid})
    await conn.execute(sa.text(
        "INSERT INTO journal_entries (user_id, entry_date, content, life_area_tags) "
        "VALUES (:u, '2026-10-01', 'x', CAST(:tags AS jsonb))"),
        {"u": uid, "tags": json.dumps(["discipline", "career", "mental", "health"])})
    await conn.execute(sa.text(
        "INSERT INTO weekly_reviews (user_id, week_start_date, week_end_date, avg_scores, generation_status) "
        "VALUES (:u, '2026-09-28', '2026-10-04', CAST(:s AS jsonb), 'completed')"),
        {"u": uid, "s": json.dumps({"discipline": 6, "focus": 8, "career": 7, "health": 9, "financial": 2})})
    return uid


async def _snapshot(conn):
    areas = {r.id: r.slug for r in (await conn.execute(sa.text("SELECT id, slug FROM life_areas"))).all()}
    fks = {t: sorted((await conn.execute(sa.text(f"SELECT life_area_id FROM {t}"))).scalars().all()) for t in FK_TABLES}
    orphans = {}
    for t in FK_TABLES:
        orphans[t] = (await conn.execute(sa.text(
            f"SELECT count(*) FROM {t} x LEFT JOIN life_areas a ON a.id = x.life_area_id WHERE a.id IS NULL"))).scalar_one()
    return areas, fks, orphans


def test_six_area_migration_round_trip(monkeypatch):
    _run(_reset)
    _alembic("upgrade", BEFORE, monkeypatch)
    _run(_seed_old_data)
    areas, _, _ = _run(_snapshot)
    assert areas == OLD

    _alembic("upgrade", AFTER, monkeypatch)

    async def check_up(conn):
        areas, fks, orphans = await _snapshot(conn)
        assert areas == EXPECTED_NEW
        assert all(n == 0 for n in orphans.values()), orphans
        expected_fk = sorted(REMAP[i] for i in OLD)
        assert fks == {t: expected_fk for t in FK_TABLES}

        rows = (await conn.execute(sa.text(
            "SELECT checkin_date::text AS d, score_health, score_mind, score_relationships, score_work, score_money, "
            "score_growth, legacy_area_scores FROM daily_checkins ORDER BY checkin_date"))).mappings().all()
        full, partial, empty = rows
        # Work = round-half-up mean of Career(7) + Focus(8) + Discipline(6) = 7
        assert (full["score_health"], full["score_mind"], full["score_relationships"], full["score_work"],
                full["score_money"], full["score_growth"]) == (9, 4, 3, 7, 2, 5)
        assert full["legacy_area_scores"] == {"discipline": 6, "focus": 8, "learning": 5, "career": 7,
                                              "health": 9, "mental": 4, "social": 3, "financial": 2}
        # Focus(5) + Career(6) -> 5.5 -> 6; unrated areas stay null
        assert (partial["score_work"], partial["score_mind"], partial["score_money"]) == (6, 7, None)
        assert (empty["score_work"], empty["score_health"]) == (None, None)

        cols = set((await conn.execute(sa.text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_checkins'"))).scalars().all())
        assert not cols & {"score_discipline", "score_focus", "score_learning", "score_career",
                           "score_mental", "score_social", "score_financial"}
        tags = (await conn.execute(sa.text("SELECT life_area_tags FROM journal_entries"))).scalar_one()
        assert tags == ["work", "mind", "health"]  # discipline + career deduplicated into work
        avg = (await conn.execute(sa.text("SELECT avg_scores FROM weekly_reviews"))).scalar_one()
        assert avg == {"work": 7.0, "health": 9, "money": 2}  # (6 + 8 + 7) / 3
        # the id sequence was resynced, so a new area can still be inserted
        await conn.execute(sa.text("INSERT INTO life_areas (slug, name, sort_order) VALUES ('extra', 'Extra', 7)"))
    _run(check_up)

    _alembic("downgrade", BEFORE, monkeypatch)

    async def check_down(conn):
        areas, fks, orphans = await _snapshot(conn)
        assert areas == OLD  # the original rows and ids are back
        assert all(n == 0 for n in orphans.values()), orphans
        # Work folds back to Career (4): discipline/focus/career rows all return as 4 (documented loss)
        assert fks["habits"] == [3, 4, 4, 4, 5, 6, 7, 8]
        row = (await conn.execute(sa.text(
            "SELECT score_discipline, score_focus, score_learning, score_career, score_health, score_mental, "
            "score_social, score_financial FROM daily_checkins WHERE checkin_date = '2026-10-01'"))).one()
        assert tuple(row) == (6, 8, 5, 7, 9, 4, 3, 2)  # exact restore from legacy_area_scores
        tags = (await conn.execute(sa.text("SELECT life_area_tags FROM journal_entries"))).scalar_one()
        assert tags == ["career", "mental", "health"]
    _run(check_down)

    _alembic("upgrade", AFTER, monkeypatch)  # and it goes up again cleanly
    assert _run(_snapshot)[0] == EXPECTED_NEW
