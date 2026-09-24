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

@router.get("/my-memberships")
async def list_my_memberships(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.modules.societies.models import UnitMembership
    from app.modules.gates.models import GuardProfile, GuardAssignment, Gate

    # 1. Resident / Admin memberships
    res = await db.execute(
        select(UnitMembership)
        .where(UnitMembership.user_id == user.id, UnitMembership.is_active.is_(True))
        .options(
            selectinload(UnitMembership.society),
            selectinload(UnitMembership.unit),
            selectinload(UnitMembership.role),
        )
        .order_by(UnitMembership.is_primary.desc())
    )
    memberships = res.scalars().all()

    items = [
        {
            "id": str(m.id),
            "society_id": str(m.society_id),
            "society_name": m.society.name if m.society else "",
            "role": m.role.code if m.role else "resident",
            "role_display": m.role.display_name if m.role else "Resident",
            "unit_id": str(m.unit_id) if m.unit_id else None,
            "unit_number": m.unit.unit_number if m.unit else None,
            "membership_type": m.membership_type,
            "is_primary": m.is_primary,
        }
        for m in memberships
    ]

    # 2. Guard assignments if guard profile exists
    guard_res = await db.execute(
        select(GuardProfile)
        .where(GuardProfile.user_id == user.id, GuardProfile.is_active.is_(True))
        .options(selectinload(GuardProfile.society))
    )
    guard_profiles = guard_res.scalars().all()
    for gp in guard_profiles:
        # Check active gate assignment
        assign_res = await db.execute(
            select(GuardAssignment)
            .where(GuardAssignment.guard_id == gp.id, GuardAssignment.society_id == gp.society_id)
            .options(selectinload(GuardAssignment.gate))
        )
        assign = assign_res.scalars().first()
        items.append({
            "id": str(gp.id),
            "society_id": str(gp.society_id),
            "society_name": gp.society.name if gp.society else "Security Operations",
            "role": "guard",
            "role_display": "Security Guard",
            "unit_id": None,
            "unit_number": None,
            "membership_type": "guard",
            "is_primary": True,
            "gate_id": str(assign.gate_id) if assign else None,
            "gate_name": assign.gate.name if (assign and assign.gate) else "Main Gate",
            "employee_id": gp.employee_id,
        })

    return items


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

@router.post("/{society_id}/units/{unit_id}/memberships", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
async def add_unit_membership(
    society_id: uuid.UUID,
    unit_id: uuid.UUID,
    payload: dict,
    user: User = Depends(get_current_user),
    _auth = RequireSocietyAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = SocietyService(db)
    target_user = None
    target_user_id = payload.get("user_id")
    if target_user_id:
        target_user = await db.get(User, uuid.UUID(str(target_user_id)))
    if not target_user:
        target_user = user

    role_code = payload.get("role") or payload.get("role_code") or "resident"
    membership_req = AddMemberRequest(
        phone=target_user.phone,
        full_name=payload.get("full_name") or target_user.full_name,
        unit_id=unit_id,
        role_code=role_code,
        membership_type=payload.get("membership_type", "owner"),
        is_primary=payload.get("is_primary", True),
    )
    return await service.add_member(society_id, membership_req, user)

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
