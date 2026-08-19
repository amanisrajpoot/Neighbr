import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.auth.models import User
from app.modules.notices.schemas import (
    NoticeCreate,
    NoticeOut,
    EmergencyContactCreate,
    EmergencyContactOut,
    SOSCreate,
    SOSOut,
)
from app.modules.notices.service import NoticeService

router = APIRouter(prefix="/societies/{society_id}", tags=["Notices & Emergency"])

# Notice Board
@router.post("/notices", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
async def create_notice(
    society_id: uuid.UUID,
    payload: NoticeCreate,
    user: User = Depends(get_current_user),
    _auth = Depends(require_roles(["society_admin", "super_admin", "committee"])),
    db: AsyncSession = Depends(get_db),
):
    service = NoticeService(db)
    return await service.create_notice(society_id, payload, user)

@router.get("/notices", response_model=list[NoticeOut])
async def list_notices(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = NoticeService(db)
    return await service.list_notices(society_id)

# Emergency Contacts
@router.post("/emergency-contacts", response_model=EmergencyContactOut, status_code=status.HTTP_201_CREATED)
async def add_emergency_contact(
    society_id: uuid.UUID,
    payload: EmergencyContactCreate,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = NoticeService(db)
    return await service.add_emergency_contact(society_id, payload)

@router.get("/emergency-contacts", response_model=list[EmergencyContactOut])
async def list_emergency_contacts(
    society_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = NoticeService(db)
    return await service.list_emergency_contacts(society_id)

# SOS Trigger & Resolve
@router.post("/sos", response_model=SOSOut, status_code=status.HTTP_201_CREATED)
async def trigger_sos(
    society_id: uuid.UUID,
    payload: SOSCreate,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = NoticeService(db)
    return await service.trigger_sos(society_id, payload, user)

@router.post("/sos/{sos_id}/resolve", response_model=SOSOut)
async def resolve_sos(
    society_id: uuid.UUID,
    sos_id: uuid.UUID,
    user: User = Depends(get_current_user),
    _auth = Depends(require_roles(["society_admin", "guard", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = NoticeService(db)
    return await service.resolve_sos(society_id, sos_id, user)
