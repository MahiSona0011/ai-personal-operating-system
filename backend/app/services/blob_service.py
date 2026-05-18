import asyncio
from urllib.parse import urlparse
from azure.storage.blob import BlobServiceClient, ContentSettings
from app.core.config import settings


def _get_client() -> BlobServiceClient:
    if not settings.AZURE_STORAGE_CONNECTION_STRING:
        raise ValueError("Azure Blob Storage is not configured (AZURE_STORAGE_CONNECTION_STRING is empty)")
    return BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)


def _upload_sync(data: bytes, blob_name: str, content_type: str) -> str:
    client = _get_client()
    container = client.get_container_client(settings.AZURE_BLOB_CONTAINER)
    try:
        container.create_container()
    except Exception:
        pass  # container already exists
    blob = container.get_blob_client(blob_name)
    blob.upload_blob(
        data,
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )
    return blob.url


def _delete_sync(blob_url: str) -> None:
    try:
        client = _get_client()
    except ValueError:
        return
    parsed = urlparse(blob_url)
    # path: /{container}/{blob_name...}
    parts = parsed.path.lstrip("/").split("/", 1)
    if len(parts) < 2:
        return
    blob_name = parts[1]
    try:
        container = client.get_container_client(settings.AZURE_BLOB_CONTAINER)
        container.get_blob_client(blob_name).delete_blob()
    except Exception:
        pass


async def upload_blob(data: bytes, blob_name: str, content_type: str) -> str:
    return await asyncio.to_thread(_upload_sync, data, blob_name, content_type)


async def delete_blob(blob_url: str) -> None:
    await asyncio.to_thread(_delete_sync, blob_url)
