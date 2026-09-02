import uuid
import secrets
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.marketplace.models import MarketplaceListing, VendorService, ServiceBooking
from app.modules.marketplace.repository import MarketplaceRepository
from app.modules.marketplace.events import LISTING_CREATED, SERVICE_BOOKED
from app.modules.marketplace.schemas import (
    ListingCreate,
    ListingStatusUpdate,
    VendorCreate,
    ServiceBookingCreate,
)

class MarketplaceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MarketplaceRepository(db)

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
        await self.repo.save(listing)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(seller.id),
                event_type=LISTING_CREATED,
                entity_type="marketplace_listing",
                entity_id=str(listing.id),
                payload={"title": listing.title, "category": listing.category},
            )
        )
        return listing

    async def list_listings(
        self, society_id: uuid.UUID, category: str | None = None
    ) -> list[MarketplaceListing]:
        return await self.repo.list_listings(society_id, category)

    async def update_listing_status(
        self, society_id: uuid.UUID, listing_id: uuid.UUID, payload: ListingStatusUpdate
    ) -> MarketplaceListing:
        listing = await self.repo.get_listing(society_id, listing_id)
        if not listing:
            raise AppException(code="LISTING_NOT_FOUND", message="Listing not found", status_code=404)

        listing.status = payload.status
        await self.repo.commit()
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
        await self.repo.save(vendor)
        return vendor

    async def list_vendors(
        self, society_id: uuid.UUID, category: str | None = None
    ) -> list[VendorService]:
        return await self.repo.list_vendors(society_id, category)

    # Bookings
    async def book_service(
        self, society_id: uuid.UUID, payload: ServiceBookingCreate, resident: User
    ) -> ServiceBooking:
        vendor = await self.repo.get_vendor(payload.vendor_id)
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
        await self.repo.save(booking)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(resident.id),
                event_type=SERVICE_BOOKED,
                entity_type="service_booking",
                entity_id=str(booking.id),
                payload={"vendor": vendor.vendor_name, "gate_pass": pass_code},
            )
        )
        return booking

    async def list_bookings(
        self, society_id: uuid.UUID, resident_id: uuid.UUID | None = None
    ) -> list[ServiceBooking]:
        return await self.repo.list_bookings(society_id, resident_id)
