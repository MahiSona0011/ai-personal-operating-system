import pytest

from app.models.ai_recommendation import AIRecommendation


async def _fill_quota(db, user_id: int, n: int, rec_type: str) -> None:
    for _ in range(n):
        db.add(AIRecommendation(
            user_id=user_id, recommendation_type=rec_type, model_used="test", raw_response={},
        ))
    await db.flush()


@pytest.mark.asyncio
async def test_quota_counts_every_ai_call_type(client, auth_headers, db_session):
    me = (await client.get("/api/v1/auth/me", headers=auth_headers)).json()
    # 10 daily analyses used up the budget; on-demand must be refused even though it has no calls of its own
    await _fill_quota(db_session, me["id"], 10, "daily_analysis")

    on_demand = await client.post(
        "/api/v1/analysis/on-demand", json={"question": "How am I doing?", "context_areas": []}, headers=auth_headers
    )
    assert on_demand.status_code == 429

    weekly = await client.post(
        "/api/v1/analysis/reviews/weekly", json={"week_start": "2026-10-05"}, headers=auth_headers
    )
    assert weekly.status_code == 429

    retrigger = await client.post("/api/v1/analysis/checkin/1", headers=auth_headers)
    assert retrigger.status_code == 429


@pytest.mark.asyncio
async def test_quota_is_per_user(client, auth_headers, db_session):
    await _fill_quota(db_session, user_id=999_999, n=10, rec_type="on_demand")
    resp = await client.post("/api/v1/analysis/checkin/1", headers=auth_headers)
    assert resp.status_code == 404  # passed the quota check; check-in simply doesn't exist
