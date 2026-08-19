import uuid
from datetime import datetime, timezone
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User, Role
from app.modules.societies.models import (
    Society,
    SocietySettings,
    Building,
    Floor,
    Unit,
    UnitMembership,
    ResidentProfile,
    FamilyMember,
)
from app.modules.societies.schemas import (
    SocietyCreate,
    SocietyUpdate,
    SocietySettingsUpdate,
    BuildingCreate,
    FloorCreate,
    UnitCreate,
    UnitBulkCreate,
    AddMemberRequest,
    FamilyMemberCreate,
)

class SocietyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_society(self, payload: SocietyCreate, creator_user: User) -> Society:
        # Check slug uniqueness
        existing = await self.db.execute(select(Society).where(Society.slug == payload.slug))
        if existing.scalar_one_or_none():
            raise AppException(code="SLUG_EXISTS", message="Society slug is already taken", status_code=400)

        society = Society(
            name=payload.name,
            slug=payload.slug,
            address_line1=payload.address_line1,
            address_line2=payload.address_line2,
            city=payload.city,
            state=payload.state,
            pincode=payload.pincode,
            country=payload.country,
            logo_url=payload.logo_url,
            cover_image_url=payload.cover_image_url,
        )
        self.db.add(society)
        await self.db.flush()

        # Create default society settings
        settings = SocietySettings(society_id=society.id)
        self.db.add(settings)

        # Get or create society_admin role
        role_res = await self.db.execute(select(Role).where(Role.code == "society_admin"))
        admin_role = role_res.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(code="society_admin", display_name="Society Admin", is_system=True)
            self.db.add(admin_role)
            await self.db.flush()

        # Attach creator as society_admin
        membership = UnitMembership(
            user_id=creator_user.id,
            society_id=society.id,
            role_id=admin_role.id,
            is_primary=True,
            is_active=True,
            approved_by=creator_user.id,
            approved_at=datetime.now(timezone.utc),
        )
        self.db.add(membership)
        await self.db.commit()
        await self.db.refresh(society)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society.id),
                actor_user_id=str(creator_user.id),
                event_type="SOCIETY_CREATED",
                entity_type="society",
                entity_id=str(society.id),
            )
        )

        return society

    async def list_societies(self) -> list[Society]:
        result = await self.db.execute(select(Society).where(Society.is_active.is_(True)))
        return list(result.scalars().all())

    async def get_society_by_slug(self, slug: str) -> Society:
        result = await self.db.execute(select(Society).where(Society.slug == slug, Society.is_active.is_(True)))
        society = result.scalars().first()
        if not society:
            raise AppException(code="SOCIETY_NOT_FOUND", message=f"Society with slug '{slug}' not found", status_code=404)
        return society

    async def get_society(self, society_id: uuid.UUID) -> Society:
        result = await self.db.execute(select(Society).where(Society.id == society_id, Society.is_active.is_(True)))
        society = result.scalar_one_or_none()
        if not society:
            raise AppException(code="SOCIETY_NOT_FOUND", message="Society not found", status_code=404)
        return society

    async def update_society(self, society_id: uuid.UUID, payload: SocietyUpdate) -> Society:
        society = await self.get_society(society_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(society, key, val)
        await self.db.commit()
        await self.db.refresh(society)
        return society

    async def get_settings(self, society_id: uuid.UUID) -> SocietySettings:
        result = await self.db.execute(select(SocietySettings).where(SocietySettings.society_id == society_id))
        settings = result.scalar_one_or_none()
        if not settings:
            settings = SocietySettings(society_id=society_id)
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)
        return settings

    async def update_settings(self, society_id: uuid.UUID, payload: SocietySettingsUpdate) -> SocietySettings:
        settings = await self.get_settings(society_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(settings, key, val)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    # Buildings & Floors
    async def create_building(self, society_id: uuid.UUID, payload: BuildingCreate) -> Building:
        await self.get_society(society_id)
        building = Building(
            society_id=society_id,
            name=payload.name,
            code=payload.code,
            total_floors=payload.total_floors,
            sort_order=payload.sort_order,
        )
        self.db.add(building)
        await self.db.commit()
        await self.db.refresh(building)
        return building

    async def list_buildings(self, society_id: uuid.UUID) -> list[Building]:
        result = await self.db.execute(
            select(Building)
            .where(Building.society_id == society_id, Building.is_active.is_(True))
            .order_by(Building.sort_order, Building.name)
        )
        return list(result.scalars().all())

    async def create_floor(self, society_id: uuid.UUID, building_id: uuid.UUID, payload: FloorCreate) -> Floor:
        floor = Floor(
            society_id=society_id,
            building_id=building_id,
            name=payload.name,
            floor_number=payload.floor_number,
            sort_order=payload.sort_order,
        )
        self.db.add(floor)
        await self.db.commit()
        await self.db.refresh(floor)
        return floor

    # Units
    async def create_unit(self, society_id: uuid.UUID, payload: UnitCreate) -> Unit:
        # Verify building belongs to this society
        b_res = await self.db.execute(
            select(Building).where(Building.id == payload.building_id, Building.society_id == society_id)
        )
        building = b_res.scalar_one_or_none()
        if not building:
            raise AppException(code="BUILDING_NOT_FOUND", message="Building not found in this society", status_code=404)

        clean_unit_num = payload.unit_number.strip().upper()
        # Check for duplicate unit number in building
        existing_res = await self.db.execute(
            select(Unit).where(
                Unit.society_id == society_id,
                Unit.building_id == payload.building_id,
                Unit.unit_number == clean_unit_num,
            )
        )
        if existing_res.scalar_one_or_none():
            raise AppException(
                code="UNIT_ALREADY_EXISTS",
                message=f"Unit '{clean_unit_num}' already exists in this tower/building",
                status_code=409,
            )

        unit = Unit(
            society_id=society_id,
            building_id=payload.building_id,
            floor_id=payload.floor_id,
            unit_number=clean_unit_num,
            unit_type=payload.unit_type,
            area_sqft=payload.area_sqft,
        )
        self.db.add(unit)

        # Update society & building total unit counts
        building.total_units = (building.total_units or 0) + 1
        soc_res = await self.db.execute(select(Society).where(Society.id == society_id))
        society = soc_res.scalar_one_or_none()
        if society:
            society.total_units = (society.total_units or 0) + 1

        await self.db.commit()
        await self.db.refresh(unit)
        return unit

    async def bulk_create_units(self, society_id: uuid.UUID, payload: UnitBulkCreate) -> list[Unit]:
        created_units = []
        for item in payload.units:
            unit = Unit(
                society_id=society_id,
                building_id=payload.building_id,
                unit_number=item.unit_number,
                unit_type=item.unit_type,
                area_sqft=item.area_sqft,
            )
            self.db.add(unit)
            created_units.append(unit)
        
        await self.db.flush()
        count = len(created_units)
        await self.db.execute(
            update(Building).where(Building.id == payload.building_id).values(total_units=Building.total_units + count)
        )
        await self.db.execute(
            update(Society).where(Society.id == society_id).values(total_units=Society.total_units + count)
        )
        await self.db.commit()
        return created_units

    async def list_units(self, society_id: uuid.UUID, building_id: uuid.UUID | None = None) -> list[Unit]:
        query = select(Unit).where(Unit.society_id == society_id, Unit.is_active.is_(True))
        if building_id:
            query = query.where(Unit.building_id == building_id)
        query = query.order_by(Unit.unit_number)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # Memberships & Residents
    async def add_member(self, society_id: uuid.UUID, payload: AddMemberRequest, actor_user: User) -> UnitMembership:
        phone = payload.phone.strip()
        user_res = await self.db.execute(select(User).where(User.phone == phone))
        user = user_res.scalar_one_or_none()
        if not user:
            user = User(phone=phone, full_name=payload.full_name)
            self.db.add(user)
            await self.db.flush()
        elif payload.full_name and not user.full_name:
            user.full_name = payload.full_name

        # Resolve role
        role_res = await self.db.execute(select(Role).where(Role.code == payload.role_code))
        role = role_res.scalar_one_or_none()
        if not role:
            role = Role(code=payload.role_code, display_name=payload.role_code.replace("_", " ").title())
            self.db.add(role)
            await self.db.flush()

        # Check existing membership
        existing_mem = await self.db.execute(
            select(UnitMembership).where(
                UnitMembership.society_id == society_id,
                UnitMembership.user_id == user.id,
                UnitMembership.unit_id == payload.unit_id,
                UnitMembership.role_id == role.id,
                UnitMembership.is_active.is_(True),
            )
        )
        if existing_mem.scalar_one_or_none():
            raise AppException(code="MEMBER_EXISTS", message="User already has this role in the society/unit", status_code=400)

        membership = UnitMembership(
            user_id=user.id,
            society_id=society_id,
            unit_id=payload.unit_id,
            role_id=role.id,
            membership_type=payload.membership_type,
            is_primary=payload.is_primary,
            is_active=True,
            approved_by=actor_user.id,
            approved_at=datetime.now(timezone.utc),
        )
        self.db.add(membership)

        if payload.unit_id:
            await self.db.execute(update(Unit).where(Unit.id == payload.unit_id).values(is_occupied=True))

        await self.db.commit()
        
        # Reload with relationships to allow clean Pydantic serialization
        res = await self.db.execute(
            select(UnitMembership)
            .where(UnitMembership.id == membership.id)
            .options(
                selectinload(UnitMembership.user),
                selectinload(UnitMembership.unit),
                selectinload(UnitMembership.role),
            )
        )
        return res.scalar_one()

    async def list_members(self, society_id: uuid.UUID) -> list[UnitMembership]:
        result = await self.db.execute(
            select(UnitMembership)
            .where(UnitMembership.society_id == society_id, UnitMembership.is_active.is_(True))
            .options(
                selectinload(UnitMembership.user),
                selectinload(UnitMembership.unit),
                selectinload(UnitMembership.role),
            )
            .order_by(UnitMembership.created_at.desc())
        )
        return list(result.scalars().all())

    # Family Members
    async def add_family_member(
        self, society_id: uuid.UUID, membership_id: uuid.UUID, payload: FamilyMemberCreate
    ) -> FamilyMember:
        member = FamilyMember(
            society_id=society_id,
            membership_id=membership_id,
            name=payload.name,
            phone=payload.phone,
            relation=payload.relation,
            age_group=payload.age_group,
            photo_url=payload.photo_url,
        )
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        return member

    async def list_family_members(self, society_id: uuid.UUID, membership_id: uuid.UUID) -> list[FamilyMember]:
        result = await self.db.execute(
            select(FamilyMember).where(
                FamilyMember.society_id == society_id,
                FamilyMember.membership_id == membership_id,
                FamilyMember.is_active.is_(True),
            )
        )
        return list(result.scalars().all())
