"""Runs against a real Postgres. Skipped unless TEST_POSTGRES_URL is set (CI sets it).

These exist for behaviour SQLite hides: e.g. asyncpg rejects concurrent operations on one session.
"""
import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app
from app.models import Base

PG_URL = os.getenv("TEST_POSTGRES_URL")

pytestmark = [
    pytest.mark.postgres,
    pytest.mark.skipif(not PG_URL, reason="TEST_POSTGRES_URL not set"),
]


@pytest.fixture
async def pg_client():
    engine = create_async_engine(PG_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def test_dashboard_on_postgres(pg_client):
    reg = await pg_client.post(
        "/api/v1/auth/register",
        json={"email": "pg@example.com", "password": "Test1234!", "full_name": "PG User"},
    )
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    resp = await pg_client.get("/api/v1/dashboard", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["today"]["habits_summary"]["total"] == 0


async def test_chart_endpoints_on_postgres(pg_client):
    """Every Phase 3 query runs on Postgres (types, GROUP/ORDER behaviour, FKs) with real data."""
    from datetime import date

    from app.core.areas import AREAS
    from app.core.database import get_db
    from app.models import LifeArea

    override = app.dependency_overrides[get_db]
    async for session in override():
        session.add_all([
            LifeArea(id=i, slug=s, name=n, icon=ic, color_hex=c, sort_order=i) for i, s, n, ic, c in AREAS
        ])
    reg = await pg_client.post(
        "/api/v1/auth/register",
        json={"email": "pg2@example.com", "password": "Test1234!", "full_name": "PG Two"},
    )
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    today = (await pg_client.get("/api/v1/checkins/today", headers=headers)).json()
    await pg_client.patch(f"/api/v1/checkins/{today['id']}", json={"score_health": 8, "score_work": 6}, headers=headers)
    await pg_client.post(f"/api/v1/checkins/{today['id']}/complete", headers=headers)
    habit = await pg_client.post("/api/v1/habits", json={"title": "Walk", "life_area_id": 1}, headers=headers)
    await pg_client.post(
        f"/api/v1/habits/{habit.json()['id']}/log", json={"log_date": date.today().isoformat()}, headers=headers
    )
    await pg_client.post("/api/v1/metrics", json={
        "life_area_id": 1, "metric_key": "sleep_hours", "metric_date": date.today().isoformat(),
        "value_numeric": 7.5, "unit": "h",
    }, headers=headers)
    await pg_client.post("/api/v1/goals", json={"title": "Run", "life_area_id": 1, "priority": 2}, headers=headers)

    trend = await pg_client.get("/api/v1/checkins/trend?days=30", headers=headers)
    assert trend.status_code == 200 and trend.json()["points"][-1]["life_score"] == 7.0
    dash = await pg_client.get("/api/v1/dashboard?days=30", headers=headers)
    assert dash.status_code == 200 and dash.json()["checkin_streak"] == 1
    comp = await pg_client.get("/api/v1/habits/completion?days=7", headers=headers)
    assert comp.status_code == 200 and comp.json()["habits"][0]["completed_30"] == 1
    series = await pg_client.get("/api/v1/metrics/series?key=sleep_hours&days=30", headers=headers)
    assert series.status_code == 200 and series.json()["latest"]["value"] == 7.5
    area = await pg_client.get("/api/v1/areas/1/summary?days=30", headers=headers)
    assert area.status_code == 200
    body = area.json()
    assert body["score"] == 8.0 and len(body["habits"]) == 1 and len(body["goals"]) == 1 and len(body["metrics"]) == 1
