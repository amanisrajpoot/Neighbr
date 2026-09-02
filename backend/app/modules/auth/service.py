import hashlib
import random
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.errors import AppException
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User, UserDevice, Session, OTPRequest
from app.modules.auth.repository import AuthRepository
from app.providers.sms import get_sms_provider
from app.modules.auth.schemas import (
    RequestOTPRequest,
    RequestOTPResponse,
    VerifyOTPRequest,
    TokenResponse,
    UserOut,
)

settings = get_settings()

def _hash_otp(otp: str, phone: str) -> str:
    return hashlib.sha256(f"{otp}:{phone}:{settings.JWT_SECRET_KEY}".encode()).hexdigest()

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AuthRepository(db)

    async def request_otp(self, payload: RequestOTPRequest) -> RequestOTPResponse:
        phone = payload.phone.strip()
        
        # Generate 6-digit OTP (or fixed in development for easy testing)
        otp = f"{random.randint(100000, 999999)}"
        if settings.ENVIRONMENT == "development":
            otp = "123456"

        otp_hash = _hash_otp(otp, phone)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=300)

        otp_record = OTPRequest(
            phone=phone,
            otp_hash=otp_hash,
            expires_at=expires_at,
        )
        await self.repo.create_otp_request(otp_record)

        # Emit event
        await event_bus.publish(
            DomainEvent(
                event_type="AUTH_OTP_REQUESTED",
                entity_type="user",
                payload={"phone": phone},
            )
        )

        # Send via SMS provider
        sms = get_sms_provider()
        await sms.send_otp(phone, otp)

        return RequestOTPResponse(
            phone=phone,
            expires_in_seconds=300,
            dev_otp=otp if settings.DEBUG else None,
        )

    async def verify_otp(self, payload: VerifyOTPRequest) -> TokenResponse:
        phone = payload.phone.strip()
        otp_hash = _hash_otp(payload.otp, phone)
        now = datetime.now(timezone.utc)

        otp_record = await self.repo.get_latest_unverified_otp(phone, now)

        if not otp_record or otp_record.otp_hash != otp_hash:
            if otp_record:
                otp_record.attempts += 1
                await self.repo.save(otp_record)
            raise AppException(
                code="INVALID_OTP",
                message="Invalid or expired OTP code",
                status_code=400,
            )

        # Mark OTP as verified
        otp_record.verified_at = now

        # Get or create User
        user = await self.repo.get_user_by_phone(phone)

        if not user:
            user = User(
                phone=phone,
                phone_verified=True,
            )
            await self.repo.flush(user)
        else:
            user.phone_verified = True

        # Register or update device
        device = await self.repo.get_device(user.id, payload.device_id)

        if not device:
            device = UserDevice(
                user_id=user.id,
                device_id=payload.device_id,
                device_name=payload.device_name,
                platform=payload.platform,
                push_token=payload.push_token,
                app_version=payload.app_version,
                last_active_at=now,
            )
            await self.repo.flush(device)
        else:
            device.is_active = True
            device.revoked_at = None
            device.push_token = payload.push_token or device.push_token
            device.app_version = payload.app_version or device.app_version
            device.last_active_at = now

        # Generate tokens
        token_data = {
            "sub": str(user.id),
            "phone": user.phone,
            "device_id": str(device.id),
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # Create session record
        session_record = Session(
            user_id=user.id,
            device_id=device.id,
            access_token_hash=_hash_token(access_token),
            refresh_token_hash=_hash_token(refresh_token),
            expires_at=now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            refresh_expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        
        await self.repo.save_all(otp_record, user, device, session_record)

        # Publish auth event
        await event_bus.publish(
            DomainEvent(
                actor_user_id=str(user.id),
                device_id=str(device.id),
                event_type="AUTH_LOGGED_IN",
                entity_type="user",
                entity_id=str(user.id),
            )
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise AppException(code="INVALID_TOKEN", message="Invalid token type", status_code=401)
            user_id = uuid.UUID(payload["sub"])
        except Exception:
            raise AppException(code="INVALID_TOKEN", message="Invalid or expired refresh token", status_code=401)

        token_hash = _hash_token(refresh_token)
        now = datetime.now(timezone.utc)

        # Look up active session
        session_record = await self.repo.get_active_session(user_id, token_hash, now)

        if not session_record:
            raise AppException(code="SESSION_EXPIRED", message="Session has been revoked or expired", status_code=401)

        user = await self.repo.get_user_by_id(user_id)
        if not user or not user.is_active:
            raise AppException(code="USER_INACTIVE", message="User account is inactive", status_code=403)

        # Rotate tokens
        token_data = {
            "sub": str(user.id),
            "phone": user.phone,
            "device_id": str(session_record.device_id) if session_record.device_id else None,
        }
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)

        # Update session
        session_record.access_token_hash = _hash_token(new_access_token)
        session_record.refresh_token_hash = _hash_token(new_refresh_token)
        session_record.expires_at = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        session_record.refresh_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.repo.save_all(session_record, user)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )

    async def logout(self, user_id: uuid.UUID, device_id: uuid.UUID | None = None):
        await self.repo.revoke_sessions(user_id, device_id)
