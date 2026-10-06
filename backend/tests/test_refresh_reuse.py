"""Refresh-token rotation: a chain of legitimate refreshes works, and replaying a used token kills the family."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

from app.models.user import UserSession
from app.core.security import hash_refresh_token

REFRESH = "/api/v1/auth/refresh"


async def _refresh(client, token):
    return await client.post(REFRESH, json={"refresh_token": token})


async def test_a_chain_of_refreshes_keeps_working(client, registered_user):
    _, tokens = registered_user
    token = tokens["refresh_token"]
    for _ in range(4):
        resp = await _refresh(client, token)
        assert resp.status_code == 200, resp.text
        new = resp.json()["refresh_token"]
        assert new != token
        token = new


async def test_replaying_a_used_token_is_rejected_and_revokes_the_family(client, registered_user, db_session):
    _, tokens = registered_user
    first = tokens["refresh_token"]
    second = (await _refresh(client, first)).json()["refresh_token"]

    replay = await _refresh(client, first)  # the attacker, or a stale tab, presents the old token
    assert replay.status_code == 401

    # The legitimate holder of the newest token is signed out too: we can't tell who is who.
    assert (await _refresh(client, second)).status_code == 401
    rows = (await db_session.scalars(select(UserSession))).all()
    assert rows and all(s.is_revoked for s in rows if s.user_id == rows[0].user_id)


async def test_reuse_revocation_is_committed_before_the_401(client, registered_user, db_session, monkeypatch):
    # The real get_db rolls back when a request errors; without an explicit commit the
    # revocation would be undone the moment the 401 went out.
    first = registered_user[1]["refresh_token"]
    await _refresh(client, first)

    commits = []
    real_commit = db_session.commit

    async def spy():
        commits.append(1)
        await real_commit()

    monkeypatch.setattr(db_session, "commit", spy)
    assert (await _refresh(client, first)).status_code == 401
    assert commits


async def test_reuse_does_not_touch_other_logins(client, registered_user, db_session):
    payload, tokens = registered_user
    other_login = await client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    other = other_login.json()["refresh_token"]

    first = tokens["refresh_token"]
    await _refresh(client, first)
    assert (await _refresh(client, first)).status_code == 401  # reuse

    assert (await _refresh(client, other)).status_code == 200  # a different family is unaffected


async def test_logged_out_token_cannot_refresh(client, registered_user):
    _, tokens = registered_user
    await client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert (await _refresh(client, tokens["refresh_token"])).status_code == 401


async def test_unknown_token_is_rejected(client):
    assert (await _refresh(client, "not-a-real-token")).status_code == 401


async def test_expired_token_is_rejected(client, registered_user, db_session):
    _, tokens = registered_user
    await db_session.execute(
        update(UserSession)
        .where(UserSession.refresh_token == hash_refresh_token(tokens["refresh_token"]))
        .values(expires_at=datetime.now(timezone.utc) - timedelta(minutes=1))
    )
    assert (await _refresh(client, tokens["refresh_token"])).status_code == 401
