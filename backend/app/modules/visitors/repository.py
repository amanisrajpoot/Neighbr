import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.visitors.models import VisitorProfile, VisitorPass, VisitorEvent, Blacklist

class VisitorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_visitor_profile_by_phone(self, phone: str) -> Optional[VisitorProfile]:
        res = await self.db.execute(
            select(VisitorProfile).where(VisitorProfile.phone == phone)
        )
        return res.scalar_one_or_none()

    async def get_pass_with_relations(self, pass_id: uuid.UUID) -> Optional[VisitorPass]:
        res = await self.db.execute(
            select(VisitorPass)
            .where(VisitorPass.id == pass_id)
            .options(selectinload(VisitorPass.unit), selectinload(VisitorPass.issuer))
        )
        return res.scalar_one_or_none()
        
    async def get_pass_by_id_and_society(self, pass_id: uuid.UUID, society_id: uuid.UUID) -> Optional[VisitorPass]:
        res = await self.db.execute(
            select(VisitorPass)
            .where(VisitorPass.id == pass_id, VisitorPass.society_id == society_id)
        )
        return res.scalar_one_or_none()

    async def list_passes(
        self, society_id: uuid.UUID, unit_id: Optional[uuid.UUID] = None, user_id: Optional[uuid.UUID] = None
    ) -> List[VisitorPass]:
        query = select(VisitorPass).where(VisitorPass.society_id == society_id).options(
            selectinload(VisitorPass.unit), selectinload(VisitorPass.issuer)
        )
        if unit_id:
            query = query.where(VisitorPass.unit_id == unit_id)
        if user_id:
            query = query.where(VisitorPass.issued_by == user_id)
        query = query.order_by(VisitorPass.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_pass_by_qr_or_pin(
        self, society_id: uuid.UUID, qr_token: Optional[str] = None, pin_code: Optional[str] = None
    ) -> Optional[VisitorPass]:
        query = select(VisitorPass).where(VisitorPass.society_id == society_id).options(
            selectinload(VisitorPass.unit), selectinload(VisitorPass.issuer)
        )
        if qr_token:
            query = query.where(VisitorPass.qr_token == qr_token)
        elif pin_code:
            query = query.where(VisitorPass.pass_code == pin_code)
        else:
            return None
            
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_amenity_booking_by_qr(self, society_id: uuid.UUID, qr_token: str):
        from app.modules.amenities.models import AmenityBooking
        ab_res = await self.db.execute(
            select(AmenityBooking)
            .where(AmenityBooking.society_id == society_id, AmenityBooking.qr_pass == qr_token)
            .options(selectinload(AmenityBooking.amenity), selectinload(AmenityBooking.unit), selectinload(AmenityBooking.user))
        )
        return ab_res.scalar_one_or_none()

    async def is_blacklisted(self, society_id: uuid.UUID, entity_value: str) -> bool:
        res = await self.db.execute(
            select(Blacklist).where(
                Blacklist.society_id == society_id,
                Blacklist.entity_value == entity_value,
                Blacklist.is_active.is_(True),
            )
        )
        return res.scalar_one_or_none() is not None

    async def get_event_by_idempotency_key(self, idempotency_key: str) -> Optional[VisitorEvent]:
        res = await self.db.execute(
            select(VisitorEvent).where(VisitorEvent.idempotency_key == idempotency_key)
        )
        return res.scalar_one_or_none()

    async def get_passes_by_status(self, society_id: uuid.UUID, status: str) -> List[VisitorPass]:
        result = await self.db.execute(
            select(VisitorPass).where(VisitorPass.society_id == society_id, VisitorPass.status == status)
        )
        return list(result.scalars().all())
        
    async def list_active_blacklists(self, society_id: uuid.UUID) -> List[Blacklist]:
        result = await self.db.execute(
            select(Blacklist).where(Blacklist.society_id == society_id, Blacklist.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        
    async def flush(self, obj) -> None:
        self.db.add(obj)
        await self.db.flush()
