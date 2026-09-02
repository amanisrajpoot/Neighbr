import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.staff.models import StaffProfile, StaffAssignment, StaffAttendance

class StaffRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_staff(self, society_id: uuid.UUID) -> List[StaffProfile]:
        res = await self.db.execute(
            select(StaffProfile)
            .where(StaffProfile.society_id == society_id, StaffProfile.is_active.is_(True))
        )
        return list(res.scalars().all())

    async def list_unit_staff(self, society_id: uuid.UUID, unit_id: uuid.UUID) -> List[StaffAssignment]:
        res = await self.db.execute(
            select(StaffAssignment)
            .where(
                StaffAssignment.society_id == society_id,
                StaffAssignment.unit_id == unit_id,
                StaffAssignment.is_active.is_(True),
            )
            .options(selectinload(StaffAssignment.staff), selectinload(StaffAssignment.unit))
        )
        return list(res.scalars().all())

    async def get_attendance_by_idempotency_key(self, idempotency_key: str) -> Optional[StaffAttendance]:
        res = await self.db.execute(
            select(StaffAttendance).where(StaffAttendance.idempotency_key == idempotency_key)
        )
        return res.scalar_one_or_none()

    async def get_active_attendance(self, society_id: uuid.UUID, staff_id: uuid.UUID) -> Optional[StaffAttendance]:
        res = await self.db.execute(
            select(StaffAttendance)
            .where(
                StaffAttendance.society_id == society_id,
                StaffAttendance.staff_id == staff_id,
                StaffAttendance.check_out_at.is_(None),
            )
            .order_by(StaffAttendance.check_in_at.desc())
            .limit(1)
        )
        return res.scalar_one_or_none()

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
