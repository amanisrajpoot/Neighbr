import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User, Role
from app.modules.societies.models import UnitMembership
from app.modules.gates.models import (
    Gate,
    GuardProfile,
    GuardShift,
    GuardAssignment,
    GuardAttendance,
)
from app.modules.gates.repository import GateRepository
from app.modules.gates.events import (
    GATE_CREATED,
    GUARD_CREATED,
    GUARD_CHECKED_IN,
    GUARD_CHECKED_OUT,
)
from app.modules.gates.schemas import (
    GateCreate,
    GateUpdate,
    GuardCreate,
    GuardShiftCreate,
    GuardAssignRequest,
    GuardDutyCheckIn,
    GuardDutyCheckOut,
)

class GateService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = GateRepository(db)

    # Gate Management
    async def create_gate(self, society_id: uuid.UUID, payload: GateCreate) -> Gate:
        gate = Gate(
            society_id=society_id,
            name=payload.name,
            code=payload.code,
            gate_type=payload.gate_type,
            location=payload.location,
        )
        await self.repo.save(gate)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=GATE_CREATED,
                entity_type="gate",
                entity_id=str(gate.id),
            )
        )
        return gate

    async def list_gates(self, society_id: uuid.UUID) -> list[Gate]:
        return await self.repo.list_gates(society_id)

    async def get_gate(self, gate_id: uuid.UUID) -> Gate:
        gate = await self.repo.get_gate_by_id(gate_id)
        if not gate:
            raise AppException(code="GATE_NOT_FOUND", message="Gate not found", status_code=404)
        return gate

    async def update_gate(self, gate_id: uuid.UUID, payload: GateUpdate) -> Gate:
        gate = await self.get_gate(gate_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(gate, key, val)
        await self.repo.save(gate)
        return gate

    # Guard Management
    async def create_guard(self, society_id: uuid.UUID, payload: GuardCreate) -> GuardProfile:
        phone = payload.phone.strip()
        user = await self.repo.get_user_by_phone(phone)

        if not user:
            user = User(phone=phone, full_name=payload.full_name)
            await self.repo.flush(user)

        # Check existing guard profile
        existing = await self.repo.get_guard_by_user_id(user.id, society_id)
        if existing:
            raise AppException(code="GUARD_EXISTS", message="Guard already registered for this society", status_code=400)

        # Get or create guard role
        guard_role = await self.repo.get_role_by_code("guard")
        if not guard_role:
            guard_role = Role(code="guard", display_name="Security Guard", is_system=True)
            await self.repo.flush(guard_role)

        # Create UnitMembership for guard in society
        membership = UnitMembership(
            user_id=user.id,
            society_id=society_id,
            role_id=guard_role.id,
            is_active=True,
        )
        self.db.add(membership)

        guard = GuardProfile(
            user_id=user.id,
            society_id=society_id,
            employee_id=payload.employee_id,
            id_proof_type=payload.id_proof_type,
            id_proof_number=payload.id_proof_number,
            photo_url=payload.photo_url,
        )
        await self.repo.save(guard)
        
        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=GUARD_CREATED,
                entity_type="guard",
                entity_id=str(guard.id),
            )
        )

        return await self.repo.get_guard_with_relations(guard.id)

    async def list_guards(self, society_id: uuid.UUID) -> list[GuardProfile]:
        return await self.repo.list_guards(society_id)

    # Shifts & Assignments
    async def create_shift(self, society_id: uuid.UUID, payload: GuardShiftCreate) -> GuardShift:
        shift = GuardShift(
            society_id=society_id,
            name=payload.name,
            start_time=payload.start_time,
            end_time=payload.end_time,
        )
        await self.repo.save(shift)
        return shift

    async def list_shifts(self, society_id: uuid.UUID) -> list[GuardShift]:
        return await self.repo.list_shifts(society_id)

    async def assign_guard(self, society_id: uuid.UUID, guard_id: uuid.UUID, payload: GuardAssignRequest) -> GuardAssignment:
        assignment = GuardAssignment(
            society_id=society_id,
            guard_id=guard_id,
            gate_id=payload.gate_id,
            shift_id=payload.shift_id,
            assigned_date=payload.assigned_date,
        )
        await self.repo.save(assignment)
        return assignment

    # Guard Duty Attendance
    async def check_in_duty(self, society_id: uuid.UUID, guard_id: uuid.UUID, payload: GuardDutyCheckIn) -> GuardAttendance:
        attendance = GuardAttendance(
            society_id=society_id,
            guard_id=guard_id,
            gate_id=payload.gate_id,
            check_in_at=datetime.now(timezone.utc),
            check_in_location=payload.location,
            status="on_duty",
        )
        await self.repo.save(attendance)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=GUARD_CHECKED_IN,
                entity_type="guard",
                entity_id=str(guard_id),
            )
        )
        return attendance

    async def check_out_duty(self, society_id: uuid.UUID, guard_id: uuid.UUID, payload: GuardDutyCheckOut) -> GuardAttendance:
        attendance = await self.repo.get_active_attendance(society_id, guard_id)
        if not attendance:
            raise AppException(code="NOT_ON_DUTY", message="Guard is not currently checked in for duty", status_code=400)

        attendance.check_out_at = datetime.now(timezone.utc)
        attendance.check_out_location = payload.location
        attendance.status = "off_duty"

        await self.repo.save(attendance)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type=GUARD_CHECKED_OUT,
                entity_type="guard",
                entity_id=str(guard_id),
            )
        )
        return attendance
