import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.auth.models import User
from app.modules.gates.schemas import (
    GateCreate,
    GateUpdate,
    GateOut,
    GuardCreate,
    GuardOut,
    GuardShiftCreate,
    GuardShiftOut,
    GuardAssignRequest,
    GuardAssignmentOut,
    GuardDutyCheckIn,
    GuardDutyCheckOut,
    GuardAttendanceOut,
)
from app.modules.gates.service import GateService

router = APIRouter(tags=["Gates & Guards"])

# Gate Endpoints
@router.post("/societies/{society_id}/gates", response_model=GateOut, status_code=status.HTTP_201_CREATED)
async def create_gate(
    society_id: uuid.UUID,
    payload: GateCreate,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.create_gate(society_id, payload)

@router.get("/societies/{society_id}/gates", response_model=list[GateOut])
async def list_gates(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.list_gates(society_id)

@router.patch("/gates/{gate_id}", response_model=GateOut)
async def update_gate(
    gate_id: uuid.UUID,
    payload: GateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.update_gate(gate_id, payload)

# Guard Management Endpoints
@router.post("/societies/{society_id}/guards", response_model=GuardOut, status_code=status.HTTP_201_CREATED)
async def create_guard(
    society_id: uuid.UUID,
    payload: GuardCreate,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.create_guard(society_id, payload)

@router.get("/societies/{society_id}/guards", response_model=list[GuardOut])
async def list_guards(
    society_id: uuid.UUID,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.list_guards(society_id)

# Shift Endpoints
@router.post("/societies/{society_id}/guard-shifts", response_model=GuardShiftOut, status_code=status.HTTP_201_CREATED)
async def create_shift(
    society_id: uuid.UUID,
    payload: GuardShiftCreate,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.create_shift(society_id, payload)

@router.get("/societies/{society_id}/guard-shifts", response_model=list[GuardShiftOut])
async def list_shifts(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.list_shifts(society_id)

# Guard Assignment Endpoints
@router.post("/societies/{society_id}/guards/{guard_id}/assign", response_model=GuardAssignmentOut, status_code=status.HTTP_201_CREATED)
async def assign_guard(
    society_id: uuid.UUID,
    guard_id: uuid.UUID,
    payload: GuardAssignRequest,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.assign_guard(society_id, guard_id, payload)

# Duty Check-in / Check-out Endpoints
@router.post("/societies/{society_id}/guards/{guard_id}/duty/check-in", response_model=GuardAttendanceOut)
async def guard_duty_check_in(
    society_id: uuid.UUID,
    guard_id: uuid.UUID,
    payload: GuardDutyCheckIn,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.check_in_duty(society_id, guard_id, payload)

@router.post("/societies/{society_id}/guards/{guard_id}/duty/check-out", response_model=GuardAttendanceOut)
async def guard_duty_check_out(
    society_id: uuid.UUID,
    guard_id: uuid.UUID,
    payload: GuardDutyCheckOut,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = GateService(db)
    return await service.check_out_duty(society_id, guard_id, payload)
