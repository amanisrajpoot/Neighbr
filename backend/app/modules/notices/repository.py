import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.notices.models import Notice, EmergencyContact, SOSEvent
from app.modules.societies.models import Society

class NoticeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_society(self, society_id: uuid.UUID) -> Society:
        res = await self.db.execute(select(Society).where(Society.id == society_id))
        society = res.scalar_one_or_none()
        if not society:
            society = Society(
                id=society_id,
                name="Greenwood Palms Heights",
                slug=f"greenwood-{str(society_id)[:8]}",
                city="Bengaluru",
                state="Karnataka",
                pincode="560066",
            )
            self.db.add(society)
            await self.db.flush()
        return society

    async def get_notice_with_author(self, notice_id: uuid.UUID) -> Optional[Notice]:
        res = await self.db.execute(
            select(Notice).where(Notice.id == notice_id).options(selectinload(Notice.author))
        )
        return res.scalar_one_or_none()

    async def list_notices(self, society_id: uuid.UUID) -> List[Notice]:
        res = await self.db.execute(
            select(Notice)
            .where(Notice.society_id == society_id, Notice.is_active.is_(True))
            .options(selectinload(Notice.author))
            .order_by(Notice.created_at.desc())
        )
        return list(res.scalars().all())

    async def list_emergency_contacts(self, society_id: uuid.UUID) -> List[EmergencyContact]:
        res = await self.db.execute(
            select(EmergencyContact)
            .where(EmergencyContact.society_id == society_id, EmergencyContact.is_active.is_(True))
            .order_by(EmergencyContact.sort_order, EmergencyContact.name)
        )
        return list(res.scalars().all())

    async def get_sos_event(self, society_id: uuid.UUID, sos_id: uuid.UUID) -> Optional[SOSEvent]:
        res = await self.db.execute(
            select(SOSEvent).where(SOSEvent.id == sos_id, SOSEvent.society_id == society_id)
        )
        return res.scalar_one_or_none()

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
