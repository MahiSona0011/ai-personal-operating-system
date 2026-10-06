import json
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.ai import ai_service
from app.core.areas import AREA_SLUGS
from app.models.habit import Habit, HabitLog
from app.models.session import WorkSession
from app.services import signals

SCORES = {"score_health": 8, "score_mind": 6, "score_relationships": 5,
          "score_work": 7, "score_money": 4, "score_growth": 9}


class _FakeClient:
    """Stands in for the Anthropic client and records what it was asked."""
    def __init__(self):
        self.calls = []
        self.messages = SimpleNamespace(create=self._create)

    async def _create(self, **kwargs):
        self.calls.append(kwargs)
        body = {"summary": "ok", "top_insight": "x", "action_items": [], "patterns": [], "system_adjustment": "y"}
        return SimpleNamespace(
            content=[SimpleNamespace(text=json.dumps(body))],
            usage=SimpleNamespace(input_tokens=1, output_tokens=1),
        )


@pytest.mark.asyncio
async def test_daily_analysis_prompt_has_six_areas(client, auth_headers, db_session, monkeypatch):
    fake = _FakeClient()
    monkeypatch.setattr(ai_service, "get_client", lambda: fake)
    # analyze_checkin commits; keep it inside the test's rolled-back transaction so the user doesn't leak
    monkeypatch.setattr(db_session, "commit", db_session.flush)
    me = (await client.get("/api/v1/auth/me", headers=auth_headers)).json()
    today = (await client.get("/api/v1/checkins/today", headers=auth_headers)).json()
    await client.patch(f"/api/v1/checkins/{today['id']}", json=SCORES, headers=auth_headers)

    await ai_service.analyze_checkin(db_session, today["id"], me["id"])

    assert len(fake.calls) == 1
    call = fake.calls[0]
    prompt = call["messages"][0]["content"]
    scores_line = next(line for line in prompt.splitlines() if line.startswith("Scores"))
    assert [s for s in AREA_SLUGS if f"{s}:" in scores_line] == AREA_SLUGS  # all six, nothing else
    assert scores_line.count(":") == 7  # the label colon plus six areas
    assert "6 life areas" in call["system"][0]["text"]


@pytest.mark.asyncio
async def test_csv_export_has_six_area_columns(client, auth_headers):
    resp = await client.get("/api/v1/export/checkins.csv", headers=auth_headers)
    header = resp.text.splitlines()[0].split(",")
    assert header == ["date", "overall_score", "mood", "energy", *AREA_SLUGS, "complete"]


@pytest.mark.asyncio
async def test_dashboard_reports_six_areas(client, auth_headers):
    resp = await client.get("/api/v1/dashboard", headers=auth_headers)
    assert list(resp.json()["life_area_scores"]) == AREA_SLUGS


@pytest.mark.asyncio
async def test_consistency_signal(client, auth_headers, db_session):
    me = (await client.get("/api/v1/auth/me", headers=auth_headers)).json()
    assert (await signals.consistency(db_session, me["id"], 7))["rate"] is None  # nothing to measure yet

    today = date.today()
    habit = Habit(user_id=me["id"], life_area_id=1, title="Walk", frequency="daily", current_streak=3,
                  created_at=datetime.now(timezone.utc) - timedelta(days=30))
    db_session.add(habit)
    await db_session.flush()
    for d in range(3):  # completed 3 of the last 7 days
        db_session.add(HabitLog(user_id=me["id"], habit_id=habit.id, log_date=today - timedelta(days=d), status="completed"))
    await db_session.flush()

    result = await signals.consistency(db_session, me["id"], 7)
    assert result == {"rate": round(3 / 7 * 100, 1), "completed": 3, "expected": 7, "best_streak": 3}


@pytest.mark.asyncio
async def test_focus_signal(client, auth_headers, db_session):
    me = (await client.get("/api/v1/auth/me", headers=auth_headers)).json()
    assert await signals.focus(db_session, me["id"], 7) == {"deep_work_minutes": 0, "sessions": 0, "avg_quality": None}

    now = datetime.now(timezone.utc)
    for minutes, quality, kind, ago in [(60, 4, "deep_work", 1), (30, 2, "deep_work", 2),
                                        (45, 5, "reading", 1), (90, 5, "deep_work", 20)]:
        db_session.add(WorkSession(user_id=me["id"], life_area_id=4, session_type=kind, title="s",
                                   started_at=now - timedelta(days=ago), duration_minutes=minutes, quality_rating=quality))
    await db_session.flush()

    # reading isn't deep work and the 20-day-old session is outside the window
    assert await signals.focus(db_session, me["id"], 7) == {"deep_work_minutes": 90, "sessions": 2, "avg_quality": 3.0}
