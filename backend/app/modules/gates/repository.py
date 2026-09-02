import uuid
from typing import Optional, List
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.gates.models import (
    Gate,
    GuardProfile,
    GuardShift,
    GuardAssignment,
    GuardDevice,
    GuardAttendance,
)
from app.modules.auth.models import User, Role
from app.modules.societies.models import UnitMembership

class GateRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Gate
    async def get_gate_by_id(self, gate_id: uuid.UUID) -> Optional[Gate]:
        res = await self.db.execute(select(Gate).where(Gate.id == gate_id, Gate.is_active.is_(True)))
        return res.scalar_one_or_none()

    async def list_gates(self, society_id: uuid.UUID) -> List[Gate]:
        res = await self.db.execute(
            select(Gate).where(Gate.society_id == society_id, Gate.is_active.is_(True)).order_by(Gate.name)
        )
        return list(res.scalars().all())

    # Users / Auth
    async def get_user_by_phone(self, phone: str) -> Optional[User]:
        res = await self.db.execute(select(User).where(User.phone == phone))
        return res.scalar_one_or_none()

    async def get_role_by_code(self, code: str) -> Optional[Role]:
        res = await self.db.execute(select(Role).where(Role.code == code))
        return res.scalar_one_or_none()

    # Guard
    async def get_guard_by_user_id(self, user_id: uuid.UUID, society_id: uuid.UUID) -> Optional[GuardProfile]:
        res = await self.db.execute(
            select(GuardProfile).where(GuardProfile.user_id == user_id, GuardProfile.society_id == society_id)
        )
        return res.scalar_one_or_none()

    async def get_guard_with_relations(self, guard_id: uuid.UUID) -> Optional[GuardProfile]:
        res = await self.db.execute(
            select(GuardProfile)
            .where(GuardProfile.id == guard_id)
            .options(selectinload(GuardProfile.user))
        )
        return res.scalar_one_or_none()

    async def list_guards(self, society_id: uuid.UUID) -> List[GuardProfile]:
        res = await self.db.execute(
            select(GuardProfile)
            .where(GuardProfile.society_id == society_id, GuardProfile.is_active.is_(True))
            .options(selectinload(GuardProfile.user))
            .order_by(GuardProfile.created_at.desc())
        )
        return list(res.scalars().all())

    # Shifts & Assignments
    async def list_shifts(self, society_id: uuid.UUID) -> List[GuardShift]:
        res = await self.db.execute(
            select(GuardShift).where(GuardShift.society_id == society_id).order_by(GuardShift.start_time)
        )
        return list(res.scalars().all())

    # Attendance
    async def get_active_attendance(self, society_id: uuid.UUID, guard_id: uuid.UUID) -> Optional[GuardAttendance]:
        res = await self.db.execute(
            select(GuardAttendance)
            .where(
                GuardAttendance.society_id == society_id,
                GuardAttendance.guard_id == guard_id,
                GuardAttendance.status == "on_duty",
            )
            .order_by(GuardAttendance.check_in_at.desc())
            .limit(1)
        )
        return res.scalar_one_or_none()

    # Base Persistence
    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

    async def flush(self, obj) -> None:
        self.db.add(obj)
        await self.db.flush()
