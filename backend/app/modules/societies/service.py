import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

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
    FamilyMember,
)
from app.modules.societies.repository import SocietyRepository
from app.modules.societies.events import SOCIETY_CREATED
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
        self.repo = SocietyRepository(db)

    async def create_society(self, payload: SocietyCreate, creator_user: User) -> Society:
        # Check slug uniqueness
        existing = await self.repo.get_society_by_slug(payload.slug)
        if existing:
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
        await self.repo.flush(society)

        # Create default society settings
        settings = SocietySettings(society_id=society.id)
        self.db.add(settings)

        # Get or create society_admin role
        admin_role = await self.repo.get_role_by_code("society_admin")
        if not admin_role:
            admin_role = Role(code="society_admin", display_name="Society Admin", is_system=True)
            await self.repo.flush(admin_role)

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
                event_type=SOCIETY_CREATED,
                entity_type="society",
                entity_id=str(society.id),
            )
        )

        return society

    async def list_societies(self) -> list[Society]:
        return await self.repo.list_societies()

    async def get_society_by_slug(self, slug: str) -> Society:
        society = await self.repo.get_society_by_slug(slug)
        if not society or not society.is_active:
            raise AppException(code="SOCIETY_NOT_FOUND", message=f"Society with slug '{slug}' not found", status_code=404)
        return society

    async def get_society(self, society_id: uuid.UUID) -> Society:
        society = await self.repo.get_society_by_id(society_id)
        if not society:
            raise AppException(code="SOCIETY_NOT_FOUND", message="Society not found", status_code=404)
        return society

    async def update_society(self, society_id: uuid.UUID, payload: SocietyUpdate) -> Society:
        society = await self.get_society(society_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(society, key, val)
        await self.repo.save(society)
        return society

    async def get_settings(self, society_id: uuid.UUID) -> SocietySettings:
        settings = await self.repo.get_settings(society_id)
        if not settings:
            settings = SocietySettings(society_id=society_id)
            await self.repo.save(settings)
        return settings

    async def update_settings(self, society_id: uuid.UUID, payload: SocietySettingsUpdate) -> SocietySettings:
        settings = await self.get_settings(society_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(settings, key, val)
        await self.repo.save(settings)
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
        await self.repo.save(building)
        return building

    async def list_buildings(self, society_id: uuid.UUID) -> list[Building]:
        return await self.repo.list_buildings(society_id)

    async def create_floor(self, society_id: uuid.UUID, building_id: uuid.UUID, payload: FloorCreate) -> Floor:
        floor = Floor(
            society_id=society_id,
            building_id=building_id,
            name=payload.name,
            floor_number=payload.floor_number,
            sort_order=payload.sort_order,
        )
        await self.repo.save(floor)
        return floor

    # Units
    async def create_unit(self, society_id: uuid.UUID, payload: UnitCreate) -> Unit:
        building = await self.repo.get_building(payload.building_id, society_id)
        if not building:
            raise AppException(code="BUILDING_NOT_FOUND", message="Building not found in this society", status_code=404)

        clean_unit_num = payload.unit_number.strip().upper()
        existing = await self.repo.get_unit_by_number(society_id, payload.building_id, clean_unit_num)
        if existing:
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
        await self.db.flush()
        
        await self.repo.increment_unit_counts(society_id, payload.building_id, 1)
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
        await self.repo.increment_unit_counts(society_id, payload.building_id, len(created_units))
        return created_units

    async def list_units(self, society_id: uuid.UUID, building_id: uuid.UUID | None = None) -> list[Unit]:
        return await self.repo.list_units(society_id, building_id)

    # Memberships & Residents
    async def add_member(self, society_id: uuid.UUID, payload: AddMemberRequest, actor_user: User) -> UnitMembership:
        phone = payload.phone.strip()
        user = await self.repo.get_user_by_phone(phone)
        if not user:
            user = User(phone=phone, full_name=payload.full_name)
            await self.repo.flush(user)
        elif payload.full_name and not user.full_name:
            user.full_name = payload.full_name

        role = await self.repo.get_role_by_code(payload.role_code)
        if not role:
            role = Role(code=payload.role_code, display_name=payload.role_code.replace("_", " ").title())
            await self.repo.flush(role)

        existing_mem = await self.repo.get_membership(society_id, user.id, payload.unit_id, role.id)
        if existing_mem:
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
            await self.repo.mark_unit_occupied(payload.unit_id)

        await self.db.commit()
        return await self.repo.get_membership_with_relations(membership.id)

    async def list_members(self, society_id: uuid.UUID) -> list[UnitMembership]:
        return await self.repo.list_members(society_id)

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
        await self.repo.save(member)
        return member

    async def list_family_members(self, society_id: uuid.UUID, membership_id: uuid.UUID) -> list[FamilyMember]:
        return await self.repo.list_family_members(society_id, membership_id)
