import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.marketplace.models import MarketplaceListing, VendorService, ServiceBooking

class MarketplaceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_listing(self, society_id: uuid.UUID, listing_id: uuid.UUID) -> Optional[MarketplaceListing]:
        res = await self.db.execute(
            select(MarketplaceListing).where(
                MarketplaceListing.id == listing_id, MarketplaceListing.society_id == society_id
            )
        )
        return res.scalar_one_or_none()

    async def list_listings(self, society_id: uuid.UUID, category: Optional[str] = None) -> List[MarketplaceListing]:
        query = (
            select(MarketplaceListing)
            .where(MarketplaceListing.society_id == society_id, MarketplaceListing.status != "REMOVED")
            .options(
                selectinload(MarketplaceListing.seller),
                selectinload(MarketplaceListing.unit),
            )
        )
        if category and category != "all":
            query = query.where(MarketplaceListing.category == category)

        query = query.order_by(MarketplaceListing.created_at.desc())
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def get_vendor(self, vendor_id: uuid.UUID) -> Optional[VendorService]:
        return await self.db.get(VendorService, vendor_id)

    async def list_vendors(self, society_id: uuid.UUID, category: Optional[str] = None) -> List[VendorService]:
        query = select(VendorService).where(VendorService.society_id == society_id, VendorService.is_active.is_(True))
        if category and category != "all":
            query = query.where(VendorService.category == category)
        query = query.order_by(VendorService.rating.desc())
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def list_bookings(self, society_id: uuid.UUID, resident_id: Optional[uuid.UUID] = None) -> List[ServiceBooking]:
        query = (
            select(ServiceBooking)
            .where(ServiceBooking.society_id == society_id)
            .options(
                selectinload(ServiceBooking.vendor),
                selectinload(ServiceBooking.resident),
                selectinload(ServiceBooking.unit),
            )
        )
        if resident_id:
            query = query.where(ServiceBooking.resident_id == resident_id)

        query = query.order_by(ServiceBooking.created_at.desc())
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

    async def commit(self) -> None:
        await self.db.commit()
