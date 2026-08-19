import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.auth.models import User
from app.modules.visitors.schemas import (
    CreateVisitorPassRequest,
    VisitorPassOut,
    ScanPassRequest,
    GateCheckInRequest,
    GateCheckOutRequest,
    VisitorEventOut,
    BlacklistCreate,
    BlacklistOut,
)
from app.modules.visitors.service import VisitorService

router = APIRouter(tags=["Visitors & Passes"])

# Resident Passes
@router.post("/societies/{society_id}/visitors/passes", response_model=VisitorPassOut, status_code=status.HTTP_201_CREATED)
async def create_visitor_pass(
    society_id: uuid.UUID,
    payload: CreateVisitorPassRequest,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = VisitorService(db)
    return await service.create_pass(society_id, payload, user)

@router.get("/societies/{society_id}/visitors/passes", response_model=list[VisitorPassOut])
async def list_passes(
    society_id: uuid.UUID,
    unit_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = VisitorService(db)
    # If platform admin or guard or society_admin, allow viewing all passes across the society
    is_staff = user.is_platform_admin or (mem and mem.role and mem.role.code in ("society_admin", "guard", "security_supervisor", "committee"))
    user_filter = None if is_staff else user.id
    return await service.list_passes(society_id, unit_id=unit_id, user_id=user_filter)

# Gatekeeping & Scanning
@router.post("/societies/{society_id}/gates/{gate_id}/scan", response_model=VisitorPassOut)
async def scan_pass(
    society_id: uuid.UUID,
    gate_id: uuid.UUID,
    payload: ScanPassRequest,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = VisitorService(db)
    return await service.scan_pass(society_id, qr_token=payload.qr_token, pin_code=payload.pin_code, gate_id=gate_id)

@router.post("/societies/{society_id}/gates/{gate_id}/check-in", response_model=VisitorEventOut)
async def gate_check_in(
    society_id: uuid.UUID,
    gate_id: uuid.UUID,
    payload: GateCheckInRequest,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = VisitorService(db)
    return await service.check_in(society_id, gate_id, payload)

@router.post("/societies/{society_id}/gates/{gate_id}/check-out", response_model=VisitorEventOut)
async def gate_check_out(
    society_id: uuid.UUID,
    gate_id: uuid.UUID,
    payload: GateCheckOutRequest,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = VisitorService(db)
    return await service.check_out(society_id, gate_id, payload)

@router.get("/societies/{society_id}/visitors/inside", response_model=list[VisitorPassOut])
async def list_inside_visitors(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = VisitorService(db)
    return await service.list_inside_visitors(society_id)

# Blacklist Management
@router.post("/societies/{society_id}/blacklist", response_model=BlacklistOut, status_code=status.HTTP_201_CREATED)
@router.post("/societies/{society_id}/visitors/blacklist", response_model=BlacklistOut, status_code=status.HTTP_201_CREATED)
async def add_blacklist(
    society_id: uuid.UUID,
    payload: BlacklistCreate,
    user: User = Depends(get_current_user),
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = VisitorService(db)
    return await service.add_blacklist(society_id, payload, user)

@router.get("/societies/{society_id}/blacklist", response_model=list[BlacklistOut])
@router.get("/societies/{society_id}/visitors/blacklist", response_model=list[BlacklistOut])
async def list_blacklists(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = VisitorService(db)
    return await service.list_blacklists(society_id)
