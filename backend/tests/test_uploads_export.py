"""Avatar uploads (blob storage mocked), the blob service itself, and the CSV exports."""
import csv
import io
from datetime import date, timedelta

import pytest

from app.api.v1.endpoints import uploads
from app.core.config import settings
from app.services import blob_service

API = "/api/v1"
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


# --- uploads ---------------------------------------------------------------------------------

@pytest.fixture
def blobs(monkeypatch):
    """Stand-in for Azure: records uploads and deletes, never touches the network."""
    store = {"uploaded": [], "deleted": [], "fail": None}

    async def upload(data, name, content_type):
        if store["fail"]:
            raise ValueError(store["fail"])
        store["uploaded"].append((name, content_type, len(data)))
        return f"https://blob.test/avatars/{name.rsplit('/', 1)[-1]}"

    async def delete(url):
        store["deleted"].append(url)

    monkeypatch.setattr(uploads.blob_service, "upload_blob", upload)
    monkeypatch.setattr(uploads.blob_service, "delete_blob", delete)
    return store


async def post_avatar(client, headers, data=PNG, name="me.png", content_type="image/png"):
    return await client.post(f"{API}/uploads/avatar", files={"file": (name, data, content_type)}, headers=headers)


async def test_avatar_upload_stores_the_url_on_the_user(client, auth_headers, blobs):
    resp = await post_avatar(client, auth_headers)
    assert resp.status_code == 200
    url = resp.json()["avatar_url"]
    assert url.startswith("https://blob.test/")
    assert (await client.get(f"{API}/auth/me", headers=auth_headers)).json()["avatar_url"] == url

    name, content_type, size = blobs["uploaded"][0]
    assert name.startswith("avatars/") and name.endswith(".png")
    assert (content_type, size) == ("image/png", len(PNG))


async def test_avatar_names_are_unguessable_and_per_user(client, auth_headers, blobs):
    await post_avatar(client, auth_headers)
    await post_avatar(client, auth_headers)
    names = [n for n, _, _ in blobs["uploaded"]]
    assert len(set(names)) == 2


async def test_replacing_an_avatar_deletes_the_old_one(client, auth_headers, blobs):
    first = (await post_avatar(client, auth_headers)).json()["avatar_url"]
    assert blobs["deleted"] == []
    await post_avatar(client, auth_headers)
    assert blobs["deleted"] == [first]


@pytest.mark.parametrize("content_type", ["image/jpeg", "image/png", "image/webp", "image/gif"])
async def test_avatar_accepts_the_allowed_image_types(client, auth_headers, blobs, content_type):
    assert (await post_avatar(client, auth_headers, content_type=content_type)).status_code == 200


@pytest.mark.parametrize("content_type", ["text/html", "application/pdf", "image/svg+xml", "application/octet-stream"])
async def test_avatar_rejects_other_content_types(client, auth_headers, blobs, content_type):
    resp = await post_avatar(client, auth_headers, data=b"<script>alert(1)</script>", content_type=content_type)
    assert resp.status_code == 422
    assert blobs["uploaded"] == []


async def test_avatar_size_cap(client, auth_headers, blobs):
    at_limit = await post_avatar(client, auth_headers, data=b"x" * uploads.MAX_AVATAR_BYTES)
    assert at_limit.status_code == 200

    too_big = await post_avatar(client, auth_headers, data=b"x" * (uploads.MAX_AVATAR_BYTES + 1))
    assert too_big.status_code == 413
    assert len(blobs["uploaded"]) == 1  # only the one at the limit


async def test_avatar_needs_a_file(client, auth_headers, blobs):
    assert (await client.post(f"{API}/uploads/avatar", headers=auth_headers)).status_code == 422


async def test_avatar_reports_unconfigured_storage_as_503(client, auth_headers, blobs):
    blobs["fail"] = "Azure Blob Storage is not configured"
    resp = await post_avatar(client, auth_headers)
    assert resp.status_code == 503
    assert "not configured" in resp.json()["detail"]


# --- blob service ----------------------------------------------------------------------------

class FakeBlob:
    def __init__(self, name, log):
        self.name, self.log = name, log
        self.url = f"https://acct.blob.test/avatars/{name}"

    def upload_blob(self, data, overwrite, content_settings):
        self.log.append(("upload", self.name, len(data), overwrite, content_settings.content_type))

    def delete_blob(self):
        self.log.append(("delete", self.name))


class FakeContainer:
    def __init__(self, log, exists=False):
        self.log, self.exists = log, exists

    def create_container(self):
        if self.exists:
            raise RuntimeError("ContainerAlreadyExists")
        self.log.append(("create_container",))

    def get_blob_client(self, name):
        return FakeBlob(name, self.log)


@pytest.fixture
def azure(monkeypatch):
    log = []
    state = {"exists": False}

    class FakeService:
        @classmethod
        def from_connection_string(cls, conn):
            log.append(("connect", conn))
            return cls()

        def get_container_client(self, name):
            log.append(("container", name))
            return FakeContainer(log, state["exists"])

    monkeypatch.setattr(blob_service, "BlobServiceClient", FakeService)
    monkeypatch.setattr(settings, "AZURE_STORAGE_CONNECTION_STRING", "UseDevelopmentStorage=true")
    monkeypatch.setattr(settings, "AZURE_BLOB_CONTAINER", "avatars")
    return log, state


async def test_blob_upload_creates_the_container_and_returns_the_url(azure):
    log, _ = azure
    url = await blob_service.upload_blob(b"abc", "u/1.png", "image/png")
    assert url == "https://acct.blob.test/avatars/u/1.png"
    assert ("create_container",) in log
    assert ("upload", "u/1.png", 3, True, "image/png") in log


async def test_blob_upload_tolerates_an_existing_container(azure):
    log, state = azure
    state["exists"] = True
    assert await blob_service.upload_blob(b"abc", "u/1.png", "image/png")
    assert ("create_container",) not in log


async def test_blob_upload_without_configuration_raises_value_error(monkeypatch):
    monkeypatch.setattr(settings, "AZURE_STORAGE_CONNECTION_STRING", "")
    with pytest.raises(ValueError, match="not configured"):
        await blob_service.upload_blob(b"abc", "u/1.png", "image/png")


async def test_blob_delete_takes_the_blob_name_from_the_url(azure):
    log, _ = azure
    await blob_service.delete_blob("https://acct.blob.test/avatars/avatars/7/abc.png")
    assert ("delete", "avatars/7/abc.png") in log


async def test_blob_delete_ignores_unusable_urls_and_missing_config(azure, monkeypatch):
    log, _ = azure
    await blob_service.delete_blob("https://acct.blob.test/just-a-container")
    assert not any(entry[0] == "delete" for entry in log)

    monkeypatch.setattr(settings, "AZURE_STORAGE_CONNECTION_STRING", "")
    await blob_service.delete_blob("https://acct.blob.test/avatars/x.png")  # must not raise


# --- exports ---------------------------------------------------------------------------------

async def add_checkin(client, headers, day: date, **scores):
    body = {"checkin_date": day.isoformat(), **scores}
    resp = await client.post(f"{API}/checkins", json=body, headers=headers)
    assert resp.status_code == 201, resp.text


def parse(resp):
    assert resp.status_code == 200
    return list(csv.reader(io.StringIO(resp.text)))


async def test_checkins_csv_headers_and_rows(client, auth_headers):
    today = date.today()
    await add_checkin(client, auth_headers, today - timedelta(days=1), score_health=6, score_mind=8, mood=7, energy=5)
    await add_checkin(client, auth_headers, today, score_health=9)

    resp = await client.get(f"{API}/export/checkins.csv", headers=auth_headers)
    assert resp.headers["content-type"].startswith("text/csv")
    assert resp.headers["content-disposition"] == "attachment; filename=checkins_90d.csv"

    rows = parse(resp)
    assert rows[0] == [
        "date", "overall_score", "mood", "energy",
        "health", "mind", "relationships", "work", "money", "growth", "complete",
    ]
    assert [r[0] for r in rows[1:]] == [(today - timedelta(days=1)).isoformat(), today.isoformat()]  # oldest first
    first = dict(zip(rows[0], rows[1]))
    assert (first["health"], first["mind"], first["mood"], first["energy"]) == ("6", "8", "7", "5")
    assert first["work"] == ""  # not rated: blank, not zero


@pytest.mark.parametrize("days,expected", [(7, 1), (30, 2), (90, 3), (365, 4)])
async def test_checkins_csv_respects_the_day_range(client, auth_headers, days, expected):
    today = date.today()
    for ago in (1, 20, 80, 200):
        await add_checkin(client, auth_headers, today - timedelta(days=ago), score_health=5)

    resp = await client.get(f"{API}/export/checkins.csv", params={"days": days}, headers=auth_headers)
    assert len(parse(resp)) - 1 == expected
    assert resp.headers["content-disposition"].endswith(f"checkins_{days}d.csv")


@pytest.mark.parametrize("days", [0, 366, "soon"])
async def test_exports_reject_a_bad_range(client, auth_headers, days):
    for kind in ("checkins", "habits"):
        assert (await client.get(f"{API}/export/{kind}.csv", params={"days": days}, headers=auth_headers)).status_code == 422


async def test_checkins_csv_only_contains_the_callers_rows(client, auth_headers, other_headers):
    await add_checkin(client, other_headers, date.today(), score_health=3)
    assert len(parse(await client.get(f"{API}/export/checkins.csv", headers=auth_headers))) == 1  # header only


async def test_habits_csv(client, auth_headers, other_headers):
    habit = (await client.post(f"{API}/habits", json={"life_area_id": 1, "title": "Walk, then stretch"}, headers=auth_headers)).json()
    today = date.today()
    await client.post(
        f"{API}/habits/{habit['id']}/log",
        json={"log_date": today.isoformat(), "completion_count": 2, "notes": 'said "yes"'},
        headers=auth_headers,
    )
    await client.post(
        f"{API}/habits/{habit['id']}/log", json={"log_date": (today - timedelta(days=200)).isoformat()}, headers=auth_headers
    )

    resp = await client.get(f"{API}/export/habits.csv", headers=auth_headers)
    assert resp.headers["content-disposition"] == "attachment; filename=habits_90d.csv"
    rows = parse(resp)
    assert rows[0] == ["date", "habit_id", "habit_title", "completion_count", "status", "notes"]
    assert len(rows) == 2  # the 200-day-old log is outside the default range
    # commas and quotes survive the CSV round trip
    assert rows[1] == [today.isoformat(), str(habit["id"]), "Walk, then stretch", "2", "completed", 'said "yes"']

    assert len(parse(await client.get(f"{API}/export/habits.csv", params={"days": 365}, headers=auth_headers))) == 3
    assert len(parse(await client.get(f"{API}/export/habits.csv", headers=other_headers))) == 1
