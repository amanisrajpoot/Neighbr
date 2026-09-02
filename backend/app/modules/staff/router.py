import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.staff.permissions import RequireStaffAdmin, RequireResident, RequireGuard
from app.modules.staff.schemas import (
    StaffCreate,
    StaffOut,
    StaffAssignRequest,
    StaffAssignmentOut,
    StaffAttendanceCheckIn,
    StaffAttendanceCheckOut,
    StaffAttendanceOut,
)
from app.modules.staff.service import StaffService

router = APIRouter(prefix="/societies/{society_id}/staff", tags=["Staff & Domestic Help"])

@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
async def create_staff(
    society_id: uuid.UUID,
    payload: StaffCreate,
    _auth = RequireStaffAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = StaffService(db)
    return await service.create_staff(society_id, payload)

@router.get("", response_model=list[StaffOut])
async def list_staff(
    society_id: uuid.UUID,
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = StaffService(db)
    return await service.list_staff(society_id)

@router.post("/{staff_id}/assign", response_model=StaffAssignmentOut, status_code=status.HTTP_201_CREATED)
async def assign_staff(
    society_id: uuid.UUID,
    staff_id: uuid.UUID,
    payload: StaffAssignRequest,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = StaffService(db)
    return await service.assign_staff(society_id, staff_id, payload, user)

@router.get("/units/{unit_id}", response_model=list[StaffAssignmentOut])
async def list_unit_staff(
    society_id: uuid.UUID,
    unit_id: uuid.UUID,
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = StaffService(db)
    return await service.list_unit_staff(society_id, unit_id)

@router.post("/{staff_id}/check-in", response_model=StaffAttendanceOut)
async def staff_check_in(
    society_id: uuid.UUID,
    staff_id: uuid.UUID,
    payload: StaffAttendanceCheckIn,
    _auth = RequireGuard,
    db: AsyncSession = Depends(get_db),
):
    service = StaffService(db)
    return await service.record_attendance_in(society_id, staff_id, payload)

@router.post("/{staff_id}/check-out", response_model=StaffAttendanceOut)
async def staff_check_out(
    society_id: uuid.UUID,
    staff_id: uuid.UUID,
    payload: StaffAttendanceCheckOut,
    _auth = RequireGuard,
    db: AsyncSession = Depends(get_db),
):
    service = StaffService(db)
    return await service.record_attendance_out(society_id, staff_id, payload)
