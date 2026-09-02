import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.societies.models import UnitMembership
from app.modules.societies.permissions import RequireSocietyAdmin, RequireSocietyMember
from app.modules.societies.schemas import (
    SocietyCreate,
    SocietyUpdate,
    SocietyOut,
    SocietySettingsUpdate,
    SocietySettingsOut,
    BuildingCreate,
    BuildingOut,
    FloorCreate,
    FloorOut,
    UnitCreate,
    UnitBulkCreate,
    UnitOut,
    AddMemberRequest,
    MembershipOut,
    FamilyMemberCreate,
    FamilyMemberOut,
)
from app.modules.societies.service import SocietyService

router = APIRouter(prefix="/societies", tags=["Societies"])

# Society Management
@router.get("", response_model=list[SocietyOut])
async def list_societies(
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.list_societies()

@router.get("/slug/{slug}", response_model=SocietyOut)
async def get_society_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.get_society_by_slug(slug)

@router.post("", response_model=SocietyOut, status_code=status.HTTP_201_CREATED)
async def create_society(
    payload: SocietyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.create_society(payload, user)

@router.get("/{society_id}", response_model=SocietyOut)
async def get_society(
    society_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.get_society(society_id)

@router.patch("/{society_id}", response_model=SocietyOut)
async def update_society(
    society_id: uuid.UUID,
    payload: SocietyUpdate,
    _auth = RequireSocietyAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.update_society(society_id, payload)

@router.get("/{society_id}/settings", response_model=SocietySettingsOut)
async def get_society_settings(
    society_id: uuid.UUID,
    _mem = RequireSocietyMember,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.get_settings(society_id)

@router.patch("/{society_id}/settings", response_model=SocietySettingsOut)
async def update_society_settings(
    society_id: uuid.UUID,
    payload: SocietySettingsUpdate,
    _auth = RequireSocietyAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.update_settings(society_id, payload)

# Buildings
@router.post("/{society_id}/buildings", response_model=BuildingOut, status_code=status.HTTP_201_CREATED)
async def create_building(
    society_id: uuid.UUID,
    payload: BuildingCreate,
    _auth = RequireSocietyAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.create_building(society_id, payload)

@router.get("/{society_id}/buildings", response_model=list[BuildingOut])
async def list_buildings(
    society_id: uuid.UUID,
    _mem = RequireSocietyMember,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.list_buildings(society_id)

# Floors
@router.post("/{society_id}/buildings/{building_id}/floors", response_model=FloorOut, status_code=status.HTTP_201_CREATED)
async def create_floor(
    society_id: uuid.UUID,
    building_id: uuid.UUID,
    payload: FloorCreate,
    _auth = RequireSocietyAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.create_floor(society_id, building_id, payload)

# Units
@router.post("/{society_id}/units", response_model=UnitOut, status_code=status.HTTP_201_CREATED)
async def create_unit(
    society_id: uuid.UUID,
    payload: UnitCreate,
    _auth = RequireSocietyAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.create_unit(society_id, payload)

@router.post("/{society_id}/units/bulk", response_model=list[UnitOut], status_code=status.HTTP_201_CREATED)
async def bulk_create_units(
    society_id: uuid.UUID,
    payload: UnitBulkCreate,
    _auth = RequireSocietyAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.bulk_create_units(society_id, payload)

@router.get("/{society_id}/units", response_model=list[UnitOut])
async def list_units(
    society_id: uuid.UUID,
    building_id: uuid.UUID | None = None,
    _mem = RequireSocietyMember,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.list_units(society_id, building_id)

# Memberships & Residents
@router.post("/{society_id}/members", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
@router.post("/{society_id}/residents", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
async def add_member(
    society_id: uuid.UUID,
    payload: AddMemberRequest,
    user: User = Depends(get_current_user),
    _auth = RequireSocietyAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.add_member(society_id, payload, user)

@router.get("/{society_id}/members", response_model=list[MembershipOut])
@router.get("/{society_id}/residents", response_model=list[MembershipOut])
async def list_members(
    society_id: uuid.UUID,
    _mem = RequireSocietyMember,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.list_members(society_id)

# Family Members
@router.post("/{society_id}/memberships/{membership_id}/family", response_model=FamilyMemberOut, status_code=status.HTTP_201_CREATED)
async def add_family_member(
    society_id: uuid.UUID,
    membership_id: uuid.UUID,
    payload: FamilyMemberCreate,
    _mem = RequireSocietyMember,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.add_family_member(society_id, membership_id, payload)

@router.get("/{society_id}/memberships/{membership_id}/family", response_model=list[FamilyMemberOut])
async def list_family_members(
    society_id: uuid.UUID,
    membership_id: uuid.UUID,
    _mem = RequireSocietyMember,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    return await service.list_family_members(society_id, membership_id)
