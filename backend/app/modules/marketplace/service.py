import uuid
import secrets
from datetime import datetime, timezone, date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.marketplace.models import MarketplaceListing, VendorService, ServiceBooking
from app.modules.marketplace.schemas import (
    ListingCreate,
    ListingStatusUpdate,
    VendorCreate,
    ServiceBookingCreate,
)

class MarketplaceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Listings
    async def create_listing(
        self, society_id: uuid.UUID, payload: ListingCreate, seller: User
    ) -> MarketplaceListing:
        listing = MarketplaceListing(
            society_id=society_id,
            seller_id=seller.id,
            unit_id=payload.unit_id,
            title=payload.title.strip(),
            description=payload.description.strip(),
            category=payload.category,
            price=0.0 if payload.is_free else payload.price,
            is_free=payload.is_free,
            images=payload.images,
        )
        self.db.add(listing)
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def list_listings(
        self, society_id: uuid.UUID, category: str | None = None
    ) -> list[MarketplaceListing]:
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
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_listing_status(
        self, society_id: uuid.UUID, listing_id: uuid.UUID, payload: ListingStatusUpdate
    ) -> MarketplaceListing:
        result = await self.db.execute(
            select(MarketplaceListing).where(
                MarketplaceListing.id == listing_id, MarketplaceListing.society_id == society_id
            )
        )
        listing = result.scalar_one_or_none()
        if not listing:
            raise AppException(code="LISTING_NOT_FOUND", message="Listing not found", status_code=404)

        listing.status = payload.status
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    # Vendors
    async def create_vendor(
        self, society_id: uuid.UUID, payload: VendorCreate
    ) -> VendorService:
        vendor = VendorService(
            society_id=society_id,
            vendor_name=payload.vendor_name.strip(),
            category=payload.category,
            description=payload.description,
            contact_phone=payload.contact_phone.strip(),
            is_verified=payload.is_verified,
            pricing_starts_at=payload.pricing_starts_at,
        )
        self.db.add(vendor)
        await self.db.commit()
        await self.db.refresh(vendor)
        return vendor

    async def list_vendors(
        self, society_id: uuid.UUID, category: str | None = None
    ) -> list[VendorService]:
        query = select(VendorService).where(VendorService.society_id == society_id, VendorService.is_active.is_(True))
        if category and category != "all":
            query = query.where(VendorService.category == category)
        query = query.order_by(VendorService.rating.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # Bookings
    async def book_service(
        self, society_id: uuid.UUID, payload: ServiceBookingCreate, resident: User
    ) -> ServiceBooking:
        vendor = await self.db.get(VendorService, payload.vendor_id)
        if not vendor:
            raise AppException(code="VENDOR_NOT_FOUND", message="Vendor service not found", status_code=404)

        pass_code = f"SVC-{vendor.category[:3].upper()}-{secrets.token_hex(2).upper()}"

        booking = ServiceBooking(
            society_id=society_id,
            vendor_id=vendor.id,
            resident_id=resident.id,
            unit_id=payload.unit_id,
            booking_date=payload.booking_date,
            time_slot=payload.time_slot,
            notes=payload.notes,
            gate_pass_code=pass_code,
            status="CONFIRMED",
        )
        self.db.add(booking)
        await self.db.commit()
        await self.db.refresh(booking)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(resident.id),
                event_type="SERVICE_BOOKED",
                entity_type="service_booking",
                entity_id=str(booking.id),
                payload={"vendor": vendor.vendor_name, "gate_pass": pass_code},
            )
        )
        return booking

    async def list_bookings(
        self, society_id: uuid.UUID, resident_id: uuid.UUID | None = None
    ) -> list[ServiceBooking]:
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
        result = await self.db.execute(query)
        return list(result.scalars().all())
