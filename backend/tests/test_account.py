"""Password reset, email verification, account deletion, profile settings."""
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.limiter import forgot_password_limiter, limiter, verify_email_limiter
from app.models.auth_token import AuthToken
from app.models.user import User
from app.services import auth_service

API = "/api/v1/auth"
EMAIL = "test@example.com"


@pytest.fixture
def mailbox(monkeypatch):
    """Capture emailed tokens instead of sending anything."""
    box = {"reset": [], "verify": []}
    from app.api.v1.endpoints import auth as auth_endpoints

    monkeypatch.setattr(auth_endpoints, "send_password_reset_email", lambda to, raw: box["reset"].append((to, raw)))
    monkeypatch.setattr(auth_endpoints, "send_verification_email", lambda to, raw: box["verify"].append((to, raw)))
    monkeypatch.setattr(auth_endpoints, "send_welcome_email", lambda *a: None)
    return box


@pytest.fixture
def hourly_limits_on():
    limiter.enabled = True
    forgot_password_limiter.reset()
    verify_email_limiter.reset()
    yield
    limiter.enabled = False
    forgot_password_limiter.reset()
    verify_email_limiter.reset()


async def _register(client, email=EMAIL):
    payload = {"email": email, "password": "Test1234!", "full_name": "Test User"}
    resp = await client.post(f"{API}/register", json=payload)
    assert resp.status_code == 201
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}, resp.json()["refresh_token"]


# --- password reset ---

@pytest.mark.asyncio
async def test_forgot_password_does_not_reveal_whether_account_exists(client, mailbox):
    await _register(client)
    known = await client.post(f"{API}/forgot-password", json={"email": EMAIL})
    unknown = await client.post(f"{API}/forgot-password", json={"email": "ghost@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert [to for to, _ in mailbox["reset"]] == [EMAIL]  # only the real account gets mail


@pytest.mark.asyncio
async def test_reset_password_is_single_use_and_revokes_sessions(client, mailbox):
    _, refresh = await _register(client)
    await client.post(f"{API}/forgot-password", json={"email": EMAIL})
    raw = mailbox["reset"][0][1]

    ok = await client.post(f"{API}/reset-password", json={"token": raw, "new_password": "Newpass99"})
    assert ok.status_code == 204
    again = await client.post(f"{API}/reset-password", json={"token": raw, "new_password": "Another99"})
    assert again.status_code == 400

    assert (await client.post(f"{API}/refresh", json={"refresh_token": refresh})).status_code == 401
    assert (await client.post(f"{API}/login", json={"email": EMAIL, "password": "Test1234!"})).status_code == 401
    assert (await client.post(f"{API}/login", json={"email": EMAIL, "password": "Newpass99"})).status_code == 200


@pytest.mark.asyncio
async def test_reset_token_expires(client, db_session, mailbox):
    await _register(client)
    await client.post(f"{API}/forgot-password", json={"email": EMAIL})
    raw = mailbox["reset"][0][1]
    token = await db_session.scalar(select(AuthToken).where(AuthToken.purpose == "password_reset"))
    token.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db_session.flush()
    resp = await client.post(f"{API}/reset-password", json={"token": raw, "new_password": "Newpass99"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == auth_service.INVALID_LINK


@pytest.mark.asyncio
async def test_newer_reset_link_invalidates_older_one(client, mailbox):
    await _register(client)
    await client.post(f"{API}/forgot-password", json={"email": EMAIL})
    await client.post(f"{API}/forgot-password", json={"email": EMAIL})
    first, second = mailbox["reset"][0][1], mailbox["reset"][1][1]
    assert (await client.post(f"{API}/reset-password", json={"token": first, "new_password": "Newpass99"})).status_code == 400
    assert (await client.post(f"{API}/reset-password", json={"token": second, "new_password": "Newpass99"})).status_code == 204


@pytest.mark.asyncio
async def test_reset_rejects_weak_password_and_garbage_token(client, mailbox):
    assert (await client.post(f"{API}/reset-password", json={"token": "x", "new_password": "weak"})).status_code == 422
    assert (await client.post(f"{API}/reset-password", json={"token": "nope", "new_password": "Newpass99"})).status_code == 400


@pytest.mark.asyncio
async def test_forgot_password_is_rate_limited(client, mailbox, hourly_limits_on):
    n = settings.RATE_LIMIT_FORGOT_PASSWORD_PER_HOUR
    codes = [(await client.post(f"{API}/forgot-password", json={"email": EMAIL})).status_code for _ in range(n + 2)]
    assert codes[:n] == [200] * n
    assert codes[-1] == 429


# --- email verification ---

@pytest.mark.asyncio
async def test_register_sends_verification_and_link_verifies(client, mailbox):
    headers, _ = await _register(client)
    assert (await client.get(f"{API}/me", headers=headers)).json()["email_verified_at"] is None
    raw = mailbox["verify"][0][1]

    assert (await client.get(f"{API}/verify-email", params={"token": raw})).status_code == 204
    assert (await client.get(f"{API}/me", headers=headers)).json()["email_verified_at"] is not None
    assert (await client.get(f"{API}/verify-email", params={"token": raw})).status_code == 400  # single use


@pytest.mark.asyncio
async def test_resend_verification_and_cooldown(client, mailbox, hourly_limits_on):
    headers, _ = await _register(client)
    n = settings.RATE_LIMIT_VERIFY_EMAIL_PER_HOUR
    codes = [(await client.post(f"{API}/verify-email/send", headers=headers)).status_code for _ in range(n + 1)]
    assert codes[:n] == [200] * n and codes[-1] == 429
    # only the newest link works
    assert (await client.get(f"{API}/verify-email", params={"token": mailbox["verify"][0][1]})).status_code == 400


@pytest.mark.asyncio
async def test_resend_when_already_verified_sends_nothing(client, mailbox):
    headers, _ = await _register(client)
    await client.get(f"{API}/verify-email", params={"token": mailbox["verify"][0][1]})
    sent = len(mailbox["verify"])
    resp = await client.post(f"{API}/verify-email/send", headers=headers)
    assert resp.status_code == 200 and len(mailbox["verify"]) == sent


@pytest.mark.asyncio
async def test_reset_token_cannot_verify_email(client, mailbox):
    await _register(client)
    await client.post(f"{API}/forgot-password", json={"email": EMAIL})
    assert (await client.get(f"{API}/verify-email", params={"token": mailbox["reset"][0][1]})).status_code == 400


# --- JWT type ---

@pytest.mark.asyncio
async def test_non_access_jwt_is_rejected(client, mailbox):
    headers, _ = await _register(client)
    me = (await client.get(f"{API}/me", headers=headers)).json()
    bad = jwt.encode(
        {"sub": str(me["id"]), "type": "refresh", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM,
    )
    assert (await client.get(f"{API}/me", headers={"Authorization": f"Bearer {bad}"})).status_code == 401


# --- delete account ---

@pytest.mark.asyncio
async def test_delete_account_needs_correct_password(client, mailbox):
    headers, _ = await _register(client)
    resp = await client.request("DELETE", f"{API}/me", json={"password": "Wrong1234"}, headers=headers)
    assert resp.status_code == 400
    assert (await client.get(f"{API}/me", headers=headers)).status_code == 200


@pytest.mark.asyncio
async def test_delete_account_removes_only_that_users_data(client, db_session, mailbox):
    a_headers, _ = await _register(client, "a@example.com")
    b_headers, _ = await _register(client, "b@example.com")
    for headers, title in ((a_headers, "A goal"), (b_headers, "B goal")):
        r = await client.post("/api/v1/goals", json={"title": title, "life_area_id": 1}, headers=headers)
        assert r.status_code == 201, r.text

    resp = await client.request("DELETE", f"{API}/me", json={"password": "Test1234!"}, headers=a_headers)
    assert resp.status_code == 204

    assert await db_session.scalar(select(User).where(User.email == "a@example.com")) is None
    assert (await client.get(f"{API}/me", headers=a_headers)).status_code == 401
    assert (await client.post(f"{API}/login", json={"email": "a@example.com", "password": "Test1234!"})).status_code == 401
    b_goals = (await client.get("/api/v1/goals", headers=b_headers)).json()
    items = b_goals["items"] if isinstance(b_goals, dict) else b_goals
    assert [g["title"] for g in items] == ["B goal"]


# --- profile settings ---

@pytest.mark.asyncio
async def test_update_settings_fields(client, mailbox):
    headers, _ = await _register(client)
    resp = await client.patch(
        f"{API}/me",
        json={"theme_preference": "dark", "digest_enabled": False, "timezone": "America/Toronto"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert (body["theme_preference"], body["digest_enabled"], body["timezone"]) == ("dark", False, "America/Toronto")


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [{"timezone": "Mars/Olympus"}, {"theme_preference": "neon"}])
async def test_update_rejects_bad_values(client, mailbox, payload):
    headers, _ = await _register(client)
    assert (await client.patch(f"{API}/me", json=payload, headers=headers)).status_code == 422
