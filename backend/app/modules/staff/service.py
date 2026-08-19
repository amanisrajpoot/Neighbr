import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.staff.models import StaffProfile, StaffAssignment, StaffAttendance
from app.modules.staff.schemas import (
    StaffCreate,
    StaffAssignRequest,
    StaffAttendanceCheckIn,
    StaffAttendanceCheckOut,
)

class StaffService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_staff(self, society_id: uuid.UUID, payload: StaffCreate) -> StaffProfile:
        staff = StaffProfile(
            society_id=society_id,
            name=payload.name,
            phone=payload.phone,
            photo_url=payload.photo_url,
            staff_type=payload.staff_type,
            id_proof_type=payload.id_proof_type,
            id_proof_number=payload.id_proof_number,
        )
        self.db.add(staff)
        await self.db.commit()
        await self.db.refresh(staff)
        return staff

    async def list_staff(self, society_id: uuid.UUID) -> list[StaffProfile]:
        result = await self.db.execute(
            select(StaffProfile).where(StaffProfile.society_id == society_id, StaffProfile.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def assign_staff(
        self, society_id: uuid.UUID, staff_id: uuid.UUID, payload: StaffAssignRequest, actor: User
    ) -> StaffAssignment:
        assignment = StaffAssignment(
            society_id=society_id,
            staff_id=staff_id,
            unit_id=payload.unit_id,
            schedule=payload.schedule,
            authorized_by=actor.id,
        )
        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)
        return assignment

    async def list_unit_staff(self, society_id: uuid.UUID, unit_id: uuid.UUID) -> list[StaffAssignment]:
        result = await self.db.execute(
            select(StaffAssignment)
            .where(
                StaffAssignment.society_id == society_id,
                StaffAssignment.unit_id == unit_id,
                StaffAssignment.is_active.is_(True),
            )
            .options(selectinload(StaffAssignment.staff), selectinload(StaffAssignment.unit))
        )
        return list(result.scalars().all())

    async def record_attendance_in(
        self, society_id: uuid.UUID, staff_id: uuid.UUID, payload: StaffAttendanceCheckIn
    ) -> StaffAttendance:
        existing = await self.db.execute(
            select(StaffAttendance).where(StaffAttendance.idempotency_key == payload.idempotency_key)
        )
        att = existing.scalar_one_or_none()
        if att:
            return att

        att = StaffAttendance(
            society_id=society_id,
            staff_id=staff_id,
            gate_id=payload.gate_id,
            unit_id=payload.unit_id,
            check_in_at=datetime.now(timezone.utc),
            idempotency_key=payload.idempotency_key,
        )
        self.db.add(att)
        await self.db.commit()
        await self.db.refresh(att)
        return att

    async def record_attendance_out(
        self, society_id: uuid.UUID, staff_id: uuid.UUID, payload: StaffAttendanceCheckOut
    ) -> StaffAttendance:
        existing = await self.db.execute(
            select(StaffAttendance).where(StaffAttendance.idempotency_key == payload.idempotency_key)
        )
        att = existing.scalar_one_or_none()
        if att:
            return att

        result = await self.db.execute(
            select(StaffAttendance)
            .where(
                StaffAttendance.society_id == society_id,
                StaffAttendance.staff_id == staff_id,
                StaffAttendance.check_out_at.is_(None),
            )
            .order_by(StaffAttendance.check_in_at.desc())
            .limit(1)
        )
        att = result.scalar_one_or_none()
        if not att:
            raise AppException(code="STAFF_NOT_CHECKED_IN", message="Staff is not checked in", status_code=400)

        att.check_out_at = datetime.now(timezone.utc)
        att.idempotency_key = payload.idempotency_key
        await self.db.commit()
        await self.db.refresh(att)
        return att
