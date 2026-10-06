from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.api.deps import CurrentUser, DB
from app.core.config import settings
from app.core.limiter import AUTH_LIMIT, forgot_password_limiter, limiter, verify_email_limiter
from app.core.security import hash_password, verify_password
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    RefreshRequest, ChangePasswordRequest, UserResponse, UpdateProfileRequest,
    ForgotPasswordRequest, ResetPasswordRequest, DeleteAccountRequest,
)
from app.services import auth_service, blob_service
from app.services.email_service import (
    send_password_reset_email, send_verification_email, send_welcome_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_LIMIT)
async def register(data: RegisterRequest, request: Request, db: DB, background_tasks: BackgroundTasks):
    try:
        user = await auth_service.register_user(db, data)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    access_token, refresh_token = await auth_service.create_session(
        db, user.id, user_agent=request.headers.get("user-agent"), ip_address=request.client.host
    )
    background_tasks.add_task(send_welcome_email, user.email, user.full_name)
    verify_token = await auth_service.start_email_verification(db, user)
    background_tasks.add_task(send_verification_email, user.email, verify_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(AUTH_LIMIT)
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
@limiter.limit(AUTH_LIMIT)
async def refresh(data: RefreshRequest, request: Request, db: DB):
    try:
        access_token, new_refresh = await auth_service.rotate_refresh_token(
            db, data.refresh_token,
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host,
        )
    except auth_service.AuthError as e:
        if e.code == "token_reuse":
            await db.commit()  # get_db rolls back on errors, which would undo the family revocation
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


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    data: ForgotPasswordRequest, request: Request, db: DB, background_tasks: BackgroundTasks
):
    """Always answers the same way, so it can't be used to discover which emails have accounts."""
    key = f"{request.client.host}:{data.email.lower()}"
    if not forgot_password_limiter.allow(key):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again later.")
    started = await auth_service.start_password_reset(db, data.email)
    if started:
        user, raw = started
        background_tasks.add_task(send_password_reset_email, user.email, raw)
    return {"message": "If an account exists for that email, a reset link is on its way."}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(AUTH_LIMIT)
async def reset_password(data: ResetPasswordRequest, request: Request, db: DB):
    try:
        await auth_service.finish_password_reset(db, data.token, data.new_password)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.post("/verify-email/send", status_code=status.HTTP_200_OK)
async def send_verification(current_user: CurrentUser, request: Request, db: DB, background_tasks: BackgroundTasks):
    if current_user.email_verified_at:
        return {"message": "Your email is already verified."}
    if not verify_email_limiter.allow(f"{current_user.id}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Try again later.")
    raw = await auth_service.start_email_verification(db, current_user)
    background_tasks.add_task(send_verification_email, current_user.email, raw)
    return {"message": "Verification email sent."}


@router.get("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(AUTH_LIMIT)
async def verify_email(token: str, request: Request, db: DB):
    try:
        await auth_service.verify_email(db, token)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(data: DeleteAccountRequest, current_user: CurrentUser, db: DB):
    if not current_user.hashed_password or not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect")
    if current_user.avatar_url:
        try:
            await blob_service.delete_blob(current_user.avatar_url)
        except Exception:  # best effort: a storage hiccup must not block account deletion
            pass
    await auth_service.delete_account_data(db, current_user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(data: ChangePasswordRequest, current_user: CurrentUser, db: DB):
    if not current_user.hashed_password or not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    await auth_service.revoke_all_user_sessions(db, current_user.id)
    await db.flush()


@router.patch("/me/onboarding", response_model=UserResponse)
async def complete_onboarding(current_user: CurrentUser, db: DB):
    current_user.onboarding_state = "complete"
    await db.flush()
    return current_user
