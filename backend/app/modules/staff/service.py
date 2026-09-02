import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.staff.models import StaffProfile, StaffAssignment, StaffAttendance
from app.modules.staff.repository import StaffRepository
from app.modules.staff.events import (
    STAFF_CREATED,
    STAFF_ASSIGNED,
    STAFF_CHECKED_IN,
    STAFF_CHECKED_OUT,
)
from app.modules.staff.schemas import (
    StaffCreate,
    StaffAssignRequest,
    StaffAttendanceCheckIn,
    StaffAttendanceCheckOut,
)

class StaffService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = StaffRepository(db)

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
        await self.repo.save(staff)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=STAFF_CREATED,
                entity_type="staff_profile",
                entity_id=str(staff.id),
            )
        )
        return staff

    async def list_staff(self, society_id: uuid.UUID) -> list[StaffProfile]:
        return await self.repo.list_staff(society_id)

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
        await self.repo.save(assignment)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(actor.id),
                event_type=STAFF_ASSIGNED,
                entity_type="staff_assignment",
                entity_id=str(assignment.id),
            )
        )
        return assignment

    async def list_unit_staff(self, society_id: uuid.UUID, unit_id: uuid.UUID) -> list[StaffAssignment]:
        return await self.repo.list_unit_staff(society_id, unit_id)

    async def record_attendance_in(
        self, society_id: uuid.UUID, staff_id: uuid.UUID, payload: StaffAttendanceCheckIn
    ) -> StaffAttendance:
        att = await self.repo.get_attendance_by_idempotency_key(payload.idempotency_key)
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
        await self.repo.save(att)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=STAFF_CHECKED_IN,
                entity_type="staff_attendance",
                entity_id=str(att.id),
            )
        )
        return att

    async def record_attendance_out(
        self, society_id: uuid.UUID, staff_id: uuid.UUID, payload: StaffAttendanceCheckOut
    ) -> StaffAttendance:
        att = await self.repo.get_attendance_by_idempotency_key(payload.idempotency_key)
        if att:
            return att

        att = await self.repo.get_active_attendance(society_id, staff_id)
        if not att:
            raise AppException(code="STAFF_NOT_CHECKED_IN", message="Staff is not checked in", status_code=400)

        att.check_out_at = datetime.now(timezone.utc)
        att.idempotency_key = payload.idempotency_key
        await self.repo.save(att)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=STAFF_CHECKED_OUT,
                entity_type="staff_attendance",
                entity_id=str(att.id),
            )
        )
        return att
