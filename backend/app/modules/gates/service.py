import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User, Role, UserDevice
from app.modules.societies.models import UnitMembership
from app.modules.gates.models import (
    Gate,
    GuardProfile,
    GuardShift,
    GuardAssignment,
    GuardDevice,
    GuardAttendance,
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

    # Gate Management
    async def create_gate(self, society_id: uuid.UUID, payload: GateCreate) -> Gate:
        gate = Gate(
            society_id=society_id,
            name=payload.name,
            code=payload.code,
            gate_type=payload.gate_type,
            location=payload.location,
        )
        self.db.add(gate)
        await self.db.commit()
        await self.db.refresh(gate)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type="GATE_CREATED",
                entity_type="gate",
                entity_id=str(gate.id),
            )
        )
        return gate

    async def list_gates(self, society_id: uuid.UUID) -> list[Gate]:
        result = await self.db.execute(
            select(Gate).where(Gate.society_id == society_id, Gate.is_active.is_(True)).order_by(Gate.name)
        )
        return list(result.scalars().all())

    async def get_gate(self, gate_id: uuid.UUID) -> Gate:
        result = await self.db.execute(select(Gate).where(Gate.id == gate_id, Gate.is_active.is_(True)))
        gate = result.scalar_one_or_none()
        if not gate:
            raise AppException(code="GATE_NOT_FOUND", message="Gate not found", status_code=404)
        return gate

    async def update_gate(self, gate_id: uuid.UUID, payload: GateUpdate) -> Gate:
        gate = await self.get_gate(gate_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(gate, key, val)
        await self.db.commit()
        await self.db.refresh(gate)
        return gate

    # Guard Management
    async def create_guard(self, society_id: uuid.UUID, payload: GuardCreate) -> GuardProfile:
        phone = payload.phone.strip()
        user_res = await self.db.execute(select(User).where(User.phone == phone))
        user = user_res.scalar_one_or_none()

        if not user:
            user = User(phone=phone, full_name=payload.full_name)
            self.db.add(user)
            await self.db.flush()

        # Check existing guard profile
        existing = await self.db.execute(
            select(GuardProfile).where(GuardProfile.user_id == user.id, GuardProfile.society_id == society_id)
        )
        if existing.scalar_one_or_none():
            raise AppException(code="GUARD_EXISTS", message="Guard already registered for this society", status_code=400)

        # Get or create guard role
        role_res = await self.db.execute(select(Role).where(Role.code == "guard"))
        guard_role = role_res.scalar_one_or_none()
        if not guard_role:
            guard_role = Role(code="guard", display_name="Security Guard", is_system=True)
            self.db.add(guard_role)
            await self.db.flush()

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
        self.db.add(guard)
        await self.db.commit()
        
        # Reload with user relationship to allow clean Pydantic serialization
        res = await self.db.execute(
            select(GuardProfile)
            .where(GuardProfile.id == guard.id)
            .options(selectinload(GuardProfile.user))
        )
        return res.scalar_one()

    async def list_guards(self, society_id: uuid.UUID) -> list[GuardProfile]:
        result = await self.db.execute(
            select(GuardProfile)
            .where(GuardProfile.society_id == society_id, GuardProfile.is_active.is_(True))
            .options(selectinload(GuardProfile.user))
            .order_by(GuardProfile.created_at.desc())
        )
        return list(result.scalars().all())

    # Shifts & Assignments
    async def create_shift(self, society_id: uuid.UUID, payload: GuardShiftCreate) -> GuardShift:
        shift = GuardShift(
            society_id=society_id,
            name=payload.name,
            start_time=payload.start_time,
            end_time=payload.end_time,
        )
        self.db.add(shift)
        await self.db.commit()
        await self.db.refresh(shift)
        return shift

    async def list_shifts(self, society_id: uuid.UUID) -> list[GuardShift]:
        result = await self.db.execute(
            select(GuardShift).where(GuardShift.society_id == society_id).order_by(GuardShift.start_time)
        )
        return list(result.scalars().all())

    async def assign_guard(self, society_id: uuid.UUID, guard_id: uuid.UUID, payload: GuardAssignRequest) -> GuardAssignment:
        assignment = GuardAssignment(
            society_id=society_id,
            guard_id=guard_id,
            gate_id=payload.gate_id,
            shift_id=payload.shift_id,
            assigned_date=payload.assigned_date,
        )
        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)
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
        self.db.add(attendance)
        await self.db.commit()
        await self.db.refresh(attendance)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type="GUARD_CHECKED_IN",
                entity_type="guard",
                entity_id=str(guard_id),
            )
        )
        return attendance

    async def check_out_duty(self, society_id: uuid.UUID, guard_id: uuid.UUID, payload: GuardDutyCheckOut) -> GuardAttendance:
        result = await self.db.execute(
            select(GuardAttendance)
            .where(
                GuardAttendance.society_id == society_id,
                GuardAttendance.guard_id == guard_id,
                GuardAttendance.status == "on_duty",
            )
            .order_by(GuardAttendance.check_in_at.desc())
            .limit(1)
        )
        attendance = result.scalar_one_or_none()
        if not attendance:
            raise AppException(code="NOT_ON_DUTY", message="Guard is not currently checked in for duty", status_code=400)

        attendance.check_out_at = datetime.now(timezone.utc)
        attendance.check_out_location = payload.location
        attendance.status = "off_duty"

        await self.db.commit()
        await self.db.refresh(attendance)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                event_type="GUARD_CHECKED_OUT",
                entity_type="guard",
                entity_id=str(guard_id),
            )
        )
        return attendance
