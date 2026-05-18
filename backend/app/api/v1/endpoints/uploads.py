import uuid
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import CurrentUser, DB
from app.schemas.auth import UserResponse
from app.services import blob_service

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/avatar", response_model=UserResponse)
async def upload_avatar(
    current_user: CurrentUser,
    db: DB,
    file: UploadFile = File(...),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File must be an image (jpeg, png, webp, gif)",
        )

    data = await file.read()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be under 5 MB",
        )

    ext = (file.filename or "upload").rsplit(".", 1)[-1].lower()
    blob_name = f"avatars/{current_user.id}/{uuid.uuid4().hex}.{ext}"

    try:
        url = await blob_service.upload_blob(data, blob_name, file.content_type or "image/jpeg")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    # Best-effort delete of previous avatar
    if current_user.avatar_url:
        await blob_service.delete_blob(current_user.avatar_url)

    current_user.avatar_url = url
    await db.flush()
    return current_user
