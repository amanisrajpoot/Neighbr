import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.modules.societies.models import Unit
from app.modules.visitors.models import VisitorPass
from app.modules.gates.models import GuardAttendance
from app.modules.notices.models import Notice, SOSEvent
from app.modules.staff.models import StaffProfile
from app.modules.audit.models import AuditEvent

class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_total_units(self, society_id: uuid.UUID) -> int:
        res = await self.db.execute(
            select(func.count(Unit.id)).where(Unit.society_id == society_id, Unit.is_active.is_(True))
        )
        return res.scalar_one() or 0

    async def get_occupied_units(self, society_id: uuid.UUID) -> int:
        res = await self.db.execute(
            select(func.count(Unit.id)).where(
                Unit.society_id == society_id, Unit.is_occupied.is_(True), Unit.is_active.is_(True)
            )
        )
        return res.scalar_one() or 0

    async def get_visitors_inside(self, society_id: uuid.UUID) -> int:
        res = await self.db.execute(
            select(func.count(VisitorPass.id)).where(
                VisitorPass.society_id == society_id, VisitorPass.status == "CHECKED_IN"
            )
        )
        return res.scalar_one() or 0

    async def get_guards_on_duty(self, society_id: uuid.UUID) -> int:
        res = await self.db.execute(
            select(func.count(GuardAttendance.id)).where(
                GuardAttendance.society_id == society_id, GuardAttendance.status == "on_duty"
            )
        )
        return res.scalar_one() or 0

    async def get_active_notices(self, society_id: uuid.UUID) -> int:
        res = await self.db.execute(
            select(func.count(Notice.id)).where(
                Notice.society_id == society_id, Notice.is_active.is_(True)
            )
        )
        return res.scalar_one() or 0

    async def get_active_sos(self, society_id: uuid.UUID) -> int:
        res = await self.db.execute(
            select(func.count(SOSEvent.id)).where(
                SOSEvent.society_id == society_id, SOSEvent.status == "active"
            )
        )
        return res.scalar_one() or 0

    async def get_total_staff(self, society_id: uuid.UUID) -> int:
        res = await self.db.execute(
            select(func.count(StaffProfile.id)).where(
                StaffProfile.society_id == society_id, StaffProfile.is_active.is_(True)
            )
        )
        return res.scalar_one() or 0

    async def list_audit_events(self, society_id: uuid.UUID, limit: int = 100) -> List[AuditEvent]:
        res = await self.db.execute(
            select(AuditEvent)
            .where(AuditEvent.society_id == society_id)
            .order_by(AuditEvent.occurred_at.desc())
            .limit(limit)
        )
        return list(res.scalars().all())

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
