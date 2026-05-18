from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import update

from app.api.deps import CurrentUser, DB
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    RefreshRequest, ChangePasswordRequest, UserResponse, UpdateProfileRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, request: Request, db: DB):
    user = await auth_service.register_user(db, data)
    access_token, refresh_token = await auth_service.create_session(
        db, user.id, user_agent=request.headers.get("user-agent"), ip_address=request.client.host
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: DB):
    try:
        user = await auth_service.authenticate_user(db, data.email, data.password)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)

    access_token, refresh_token = await auth_service.create_session(
        db, user.id, user_agent=request.headers.get("user-agent"), ip_address=request.client.host
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, request: Request, db: DB):
    try:
        access_token, new_refresh = await auth_service.rotate_refresh_token(
            db, data.refresh_token,
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host,
        )
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: RefreshRequest, db: DB):
    await auth_service.revoke_session(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UpdateProfileRequest, current_user: CurrentUser, db: DB):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.flush()
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(data: ChangePasswordRequest, current_user: CurrentUser, db: DB):
    if not current_user.hashed_password or not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    await auth_service.revoke_all_user_sessions(db, current_user.id)
    await db.flush()
