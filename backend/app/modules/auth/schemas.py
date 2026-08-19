import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class RequestOTPRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, description="Phone number with country code")

class RequestOTPResponse(BaseModel):
    message: str = "OTP sent successfully"
    phone: str
    expires_in_seconds: int = 300
    # In dev mode, return the OTP for easy testing
    dev_otp: str | None = None

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str = Field(..., min_length=6, max_length=6)
    device_id: str
    device_name: str | None = None
    platform: str = Field(..., description="ios, android, or web")
    push_token: str | None = None
    app_version: str | None = None

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str
    phone_verified: bool
    email: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
    is_active: bool
    is_platform_admin: bool
    created_at: datetime
    updated_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None
