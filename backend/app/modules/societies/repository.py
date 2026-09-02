import uuid
from typing import Optional, List
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.societies.models import (
    Society,
    SocietySettings,
    Building,
    Floor,
    Unit,
    UnitMembership,
    FamilyMember,
)
from app.modules.auth.models import User, Role

class SocietyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Societies
    async def get_society_by_slug(self, slug: str) -> Optional[Society]:
        res = await self.db.execute(select(Society).where(Society.slug == slug))
        return res.scalar_one_or_none()

    async def get_society_by_id(self, society_id: uuid.UUID) -> Optional[Society]:
        res = await self.db.execute(select(Society).where(Society.id == society_id, Society.is_active.is_(True)))
        return res.scalar_one_or_none()

    async def list_societies(self) -> List[Society]:
        res = await self.db.execute(select(Society).where(Society.is_active.is_(True)))
        return list(res.scalars().all())

    # Settings
    async def get_settings(self, society_id: uuid.UUID) -> Optional[SocietySettings]:
        res = await self.db.execute(select(SocietySettings).where(SocietySettings.society_id == society_id))
        return res.scalar_one_or_none()

    # Roles
    async def get_role_by_code(self, code: str) -> Optional[Role]:
        res = await self.db.execute(select(Role).where(Role.code == code))
        return res.scalar_one_or_none()

    # Buildings & Floors
    async def get_building(self, building_id: uuid.UUID, society_id: uuid.UUID) -> Optional[Building]:
        res = await self.db.execute(
            select(Building).where(Building.id == building_id, Building.society_id == society_id)
        )
        return res.scalar_one_or_none()

    async def list_buildings(self, society_id: uuid.UUID) -> List[Building]:
        res = await self.db.execute(
            select(Building)
            .where(Building.society_id == society_id, Building.is_active.is_(True))
            .order_by(Building.sort_order, Building.name)
        )
        return list(res.scalars().all())

    # Units
    async def get_unit_by_number(self, society_id: uuid.UUID, building_id: uuid.UUID, unit_number: str) -> Optional[Unit]:
        res = await self.db.execute(
            select(Unit).where(
                Unit.society_id == society_id,
                Unit.building_id == building_id,
                Unit.unit_number == unit_number,
            )
        )
        return res.scalar_one_or_none()

    async def list_units(self, society_id: uuid.UUID, building_id: Optional[uuid.UUID] = None) -> List[Unit]:
        query = select(Unit).where(Unit.society_id == society_id, Unit.is_active.is_(True))
        if building_id:
            query = query.where(Unit.building_id == building_id)
        query = query.order_by(Unit.unit_number)
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def increment_unit_counts(self, society_id: uuid.UUID, building_id: uuid.UUID, count: int) -> None:
        await self.db.execute(
            update(Building)
            .where(Building.id == building_id)
            .values(total_units=Building.total_units + count)
        )
        await self.db.execute(
            update(Society)
            .where(Society.id == society_id)
            .values(total_units=Society.total_units + count)
        )
        await self.db.commit()

    async def mark_unit_occupied(self, unit_id: uuid.UUID) -> None:
        await self.db.execute(update(Unit).where(Unit.id == unit_id).values(is_occupied=True))
        await self.db.commit()

    # Users
    async def get_user_by_phone(self, phone: str) -> Optional[User]:
        res = await self.db.execute(select(User).where(User.phone == phone))
        return res.scalar_one_or_none()

    # Memberships
    async def get_membership(
        self, society_id: uuid.UUID, user_id: uuid.UUID, unit_id: Optional[uuid.UUID], role_id: uuid.UUID
    ) -> Optional[UnitMembership]:
        filters = [
            UnitMembership.society_id == society_id,
            UnitMembership.user_id == user_id,
            UnitMembership.role_id == role_id,
            UnitMembership.is_active.is_(True),
        ]
        if unit_id is not None:
            filters.append(UnitMembership.unit_id == unit_id)
        else:
            filters.append(UnitMembership.unit_id.is_(None))

        res = await self.db.execute(select(UnitMembership).where(and_(*filters)))
        return res.scalar_one_or_none()

    async def get_membership_with_relations(self, membership_id: uuid.UUID) -> Optional[UnitMembership]:
        res = await self.db.execute(
            select(UnitMembership)
            .where(UnitMembership.id == membership_id)
            .options(
                selectinload(UnitMembership.user),
                selectinload(UnitMembership.unit),
                selectinload(UnitMembership.role),
            )
        )
        return res.scalar_one_or_none()

    async def list_members(self, society_id: uuid.UUID) -> List[UnitMembership]:
        res = await self.db.execute(
            select(UnitMembership)
            .where(UnitMembership.society_id == society_id, UnitMembership.is_active.is_(True))
            .options(
                selectinload(UnitMembership.user),
                selectinload(UnitMembership.unit),
                selectinload(UnitMembership.role),
            )
            .order_by(UnitMembership.created_at.desc())
        )
        return list(res.scalars().all())

    # Family Members
    async def list_family_members(self, society_id: uuid.UUID, membership_id: uuid.UUID) -> List[FamilyMember]:
        res = await self.db.execute(
            select(FamilyMember).where(
                FamilyMember.society_id == society_id,
                FamilyMember.membership_id == membership_id,
                FamilyMember.is_active.is_(True),
            )
        )
        return list(res.scalars().all())

    # Base persistence
    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

    async def flush(self, obj) -> None:
        self.db.add(obj)
        await self.db.flush()
