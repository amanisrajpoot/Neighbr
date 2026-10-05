import uuid
import csv
import io
import re
from typing import Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User, Role
from app.modules.gates.models import Gate
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
    SocietyOnboardRequest,
    BulkResidentCSVResponse,
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

    # Bulk Onboarding Wizard & CSV Engine
    async def onboard_society(self, payload: SocietyOnboardRequest, creator_user: User) -> dict[str, Any]:
        slug = payload.slug or re.sub(r"[^a-z0-9]+", "-", payload.name.lower()).strip("-")
        base_slug = slug
        counter = 1
        while await self.repo.get_society_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        soc_create = SocietyCreate(
            name=payload.name,
            slug=slug,
            address_line1=payload.address_line1,
            city=payload.city,
            state=payload.state,
            pincode=payload.pincode,
            country=payload.country,
        )
        society = await self.create_society(soc_create, creator_user)

        total_units_created = 0
        units_by_key: dict[Any, Unit] = {}

        # 1. Create Towers, Floors, and Units
        for tower in payload.towers:
            building = Building(
                society_id=society.id,
                name=tower.name,
                code=tower.code or tower.name[:10].upper(),
                total_floors=tower.floors,
                total_units=tower.floors * tower.units_per_floor,
            )
            await self.repo.flush(building)

            for f_idx in range(1, tower.floors + 1):
                floor = Floor(
                    building_id=building.id,
                    society_id=society.id,
                    name=f"Floor {f_idx}",
                    floor_number=f_idx,
                )
                await self.repo.flush(floor)

                for u_idx in range(1, tower.units_per_floor + 1):
                    flat_num = f"{f_idx * 100 + u_idx}"
                    unit = Unit(
                        society_id=society.id,
                        building_id=building.id,
                        floor_id=floor.id,
                        unit_number=flat_num,
                        unit_type=tower.unit_type,
                        is_occupied=False,
                        is_active=True,
                    )
                    await self.repo.flush(unit)
                    total_units_created += 1
                    units_by_key[(tower.name.lower(), flat_num)] = unit
                    units_by_key[flat_num] = unit

        # 2. Create Gates
        gates_created = 0
        for gate_item in payload.gates:
            gate = Gate(
                society_id=society.id,
                name=gate_item.name,
                code=gate_item.code or f"G-{gates_created + 1}",
                gate_type=gate_item.gate_type,
                is_active=True,
                is_online=True,
            )
            self.db.add(gate)
            gates_created += 1

        # 3. Onboard Initial Residents
        residents_onboarded = 0
        resident_role = await self.repo.get_role_by_code("resident")
        if not resident_role:
            resident_role = Role(code="resident", display_name="Resident", is_system=True)
            await self.repo.flush(resident_role)

        for res_item in payload.residents:
            target_unit = None
            if res_item.tower_name:
                target_unit = units_by_key.get((res_item.tower_name.lower(), res_item.flat_number))
            if not target_unit:
                target_unit = units_by_key.get(res_item.flat_number)

            user = await self.repo.get_user_by_phone(res_item.phone)
            if not user:
                user = User(
                    phone=res_item.phone,
                    full_name=res_item.name,
                    email=res_item.email,
                    is_active=True,
                    phone_verified=True,
                )
                await self.repo.flush(user)

            membership = UnitMembership(
                society_id=society.id,
                user_id=user.id,
                unit_id=target_unit.id if target_unit else None,
                role_id=resident_role.id,
                membership_type=res_item.membership_type,
                is_primary=True,
                is_active=True,
                approved_by=creator_user.id,
                approved_at=datetime.now(timezone.utc),
            )
            self.db.add(membership)
            if target_unit:
                target_unit.is_occupied = True
            residents_onboarded += 1

        society.total_units = total_units_created
        await self.db.commit()
        await self.db.refresh(society)

        return {
            "society": society,
            "towers_created": len(payload.towers),
            "units_created": total_units_created,
            "gates_created": gates_created,
            "residents_onboarded": residents_onboarded,
        }

    async def bulk_onboard_residents_csv(
        self, society_id: uuid.UUID, csv_content: str, actor_user: User
    ) -> BulkResidentCSVResponse:
        f = io.StringIO(csv_content.strip())
        reader = csv.DictReader(f)

        # Pre-fetch all units for this society
        res_units = await self.db.execute(select(Unit).where(Unit.society_id == society_id))
        all_units = res_units.scalars().all()
        unit_map = {u.unit_number.lower(): u for u in all_units}

        resident_role = await self.repo.get_role_by_code("resident")
        if not resident_role:
            resident_role = Role(code="resident", display_name="Resident", is_system=True)
            await self.repo.flush(resident_role)

        processed = 0
        onboarded = 0
        unmatched = []

        for row in reader:
            processed += 1
            # Normalize keys
            norm = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in row.items() if k}
            flat_num = norm.get("flat") or norm.get("flat_number") or norm.get("unit") or norm.get("unit_number")
            name = norm.get("name") or norm.get("resident_name") or norm.get("full_name") or "Resident"
            phone = norm.get("phone") or norm.get("mobile")
            email = norm.get("email")
            m_type = norm.get("type") or norm.get("membership_type") or "owner"

            if not phone:
                continue

            target_unit = unit_map.get(flat_num.lower()) if flat_num else None
            if not target_unit and flat_num:
                unmatched.append(flat_num)

            user = await self.repo.get_user_by_phone(phone)
            if not user:
                user = User(
                    phone=phone,
                    full_name=name,
                    email=email,
                    is_active=True,
                    phone_verified=True,
                )
                await self.repo.flush(user)

            membership = UnitMembership(
                society_id=society_id,
                user_id=user.id,
                unit_id=target_unit.id if target_unit else None,
                role_id=resident_role.id,
                membership_type=m_type,
                is_primary=True,
                is_active=True,
                approved_by=actor_user.id,
                approved_at=datetime.now(timezone.utc),
            )
            self.db.add(membership)
            if target_unit:
                target_unit.is_occupied = True
            onboarded += 1

        await self.db.commit()
        return BulkResidentCSVResponse(
            total_rows_processed=processed,
            residents_onboarded=onboarded,
            unmatched_flats=unmatched,
        )
