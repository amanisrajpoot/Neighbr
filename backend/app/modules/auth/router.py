from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    RequestOTPRequest,
    RequestOTPResponse,
    VerifyOTPRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserOut,
    UserProfileUpdate,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/otp/request", response_model=RequestOTPResponse)
@router.post("/otp/send", response_model=RequestOTPResponse)
async def request_otp(
    payload: RequestOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    return await service.request_otp(payload)

@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp(
    payload: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    return await service.verify_otp(payload)

@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    return await service.refresh_tokens(payload.refresh_token)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    await service.logout(user.id)

@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user

@router.patch("/me", response_model=UserOut)
async def update_profile(
    payload: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    await db.commit()
    await db.refresh(user)
    return user
