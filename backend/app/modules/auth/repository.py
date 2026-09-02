import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.auth.models import User, UserDevice, Session, OTPRequest

class AuthRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_otp_request(self, otp_record: OTPRequest) -> OTPRequest:
        self.db.add(otp_record)
        await self.db.commit()
        return otp_record

    async def get_latest_unverified_otp(self, phone: str, now: datetime) -> OTPRequest | None:
        result = await self.db.execute(
            select(OTPRequest)
            .where(
                OTPRequest.phone == phone,
                OTPRequest.verified_at.is_(None),
                OTPRequest.expires_at > now,
            )
            .order_by(OTPRequest.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
        
    async def get_user_by_phone(self, phone: str) -> User | None:
        result = await self.db.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_device(self, user_id: uuid.UUID, device_id: str) -> UserDevice | None:
        result = await self.db.execute(
            select(UserDevice).where(
                UserDevice.user_id == user_id,
                UserDevice.device_id == device_id,
            )
        )
        return result.scalar_one_or_none()
        
    async def get_active_session(self, user_id: uuid.UUID, refresh_token_hash: str, now: datetime) -> Session | None:
        result = await self.db.execute(
            select(Session).where(
                Session.user_id == user_id,
                Session.refresh_token_hash == refresh_token_hash,
                Session.is_revoked.is_(False),
                Session.refresh_expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def revoke_sessions(self, user_id: uuid.UUID, device_id: uuid.UUID | None = None) -> None:
        stmt = update(Session).where(Session.user_id == user_id, Session.is_revoked.is_(False))
        if device_id:
            stmt = stmt.where(Session.device_id == device_id)
        stmt = stmt.values(is_revoked=True, revoked_at=datetime.now(timezone.utc))
        await self.db.execute(stmt)
        await self.db.commit()

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        
    async def save_all(self, *objs) -> None:
        for obj in objs:
            self.db.add(obj)
        await self.db.commit()
        for obj in objs:
            await self.db.refresh(obj)

    async def flush(self, obj) -> None:
        self.db.add(obj)
        await self.db.flush()
