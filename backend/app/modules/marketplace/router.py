import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.marketplace.permissions import RequireResident, RequireMarketplaceAdmin
from app.modules.marketplace.schemas import (
    ListingCreate,
    ListingStatusUpdate,
    ListingOut,
    VendorCreate,
    VendorOut,
    ServiceBookingCreate,
    ServiceBookingOut,
)
from app.modules.marketplace.service import MarketplaceService

router = APIRouter(prefix="/societies/{society_id}/marketplace", tags=["Marketplace & Services"])

def _format_listing(lst) -> ListingOut:
    return ListingOut(
        id=lst.id,
        society_id=lst.society_id,
        seller_id=lst.seller_id,
        seller_name=lst.seller.full_name if lst.seller else "Resident",
        unit_id=lst.unit_id,
        unit_number=lst.unit.unit_number if lst.unit else None,
        title=lst.title,
        description=lst.description,
        category=lst.category,
        price=float(lst.price),
        is_free=lst.is_free,
        images=lst.images or [],
        status=lst.status,
        created_at=lst.created_at,
    )

@router.post("/listings", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
async def create_listing(
    society_id: uuid.UUID,
    payload: ListingCreate,
    seller: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    lst = await service.create_listing(society_id, payload, seller)
    full_listings = await service.list_listings(society_id)
    new_lst = next(l for l in full_listings if l.id == lst.id)
    return _format_listing(new_lst)

@router.get("/listings", response_model=list[ListingOut])
async def list_listings(
    society_id: uuid.UUID,
    category: str | None = None,
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    listings = await service.list_listings(society_id, category=category)
    return [_format_listing(l) for l in listings]

@router.patch("/listings/{listing_id}/status", response_model=ListingOut)
async def update_listing_status(
    society_id: uuid.UUID,
    listing_id: uuid.UUID,
    payload: ListingStatusUpdate,
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    lst = await service.update_listing_status(society_id, listing_id, payload)
    # Refetch full listing to format
    full_listings = await service.list_listings(society_id)
    updated_lst = next(l for l in full_listings if l.id == lst.id)
    return _format_listing(updated_lst)

@router.post("/vendors", response_model=VendorOut, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    society_id: uuid.UUID,
    payload: VendorCreate,
    _auth = RequireMarketplaceAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    v = await service.create_vendor(society_id, payload)
    return VendorOut(
        id=v.id,
        society_id=v.society_id,
        vendor_name=v.vendor_name,
        category=v.category,
        description=v.description,
        contact_phone=v.contact_phone,
        is_verified=v.is_verified,
        rating=float(v.rating),
        review_count=v.review_count,
        pricing_starts_at=float(v.pricing_starts_at),
        is_active=v.is_active,
    )

@router.get("/vendors", response_model=list[VendorOut])
async def list_vendors(
    society_id: uuid.UUID,
    category: str | None = None,
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    vendors = await service.list_vendors(society_id, category=category)
    return [
        VendorOut(
            id=v.id,
            society_id=v.society_id,
            vendor_name=v.vendor_name,
            category=v.category,
            description=v.description,
            contact_phone=v.contact_phone,
            is_verified=v.is_verified,
            rating=float(v.rating),
            review_count=v.review_count,
            pricing_starts_at=float(v.pricing_starts_at),
            is_active=v.is_active,
        )
        for v in vendors
    ]

@router.post("/bookings", response_model=ServiceBookingOut, status_code=status.HTTP_201_CREATED)
async def book_service(
    society_id: uuid.UUID,
    payload: ServiceBookingCreate,
    resident: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    b = await service.book_service(society_id, payload, resident)
    full_bookings = await service.list_bookings(society_id, resident_id=resident.id)
    new_booking = next(bk for bk in full_bookings if bk.id == b.id)
    return ServiceBookingOut(
        id=new_booking.id,
        society_id=new_booking.society_id,
        vendor_id=new_booking.vendor_id,
        vendor_name=new_booking.vendor.vendor_name if new_booking.vendor else "Vendor",
        resident_id=new_booking.resident_id,
        unit_id=new_booking.unit_id,
        unit_number=new_booking.unit.unit_number if new_booking.unit else None,
        booking_date=new_booking.booking_date,
        time_slot=new_booking.time_slot,
        notes=new_booking.notes,
        gate_pass_code=new_booking.gate_pass_code,
        status=new_booking.status,
        created_at=new_booking.created_at,
    )

@router.get("/bookings", response_model=list[ServiceBookingOut])
async def list_bookings(
    society_id: uuid.UUID,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = MarketplaceService(db)
    bookings = await service.list_bookings(society_id, resident_id=user.id)
    return [
        ServiceBookingOut(
            id=b.id,
            society_id=b.society_id,
            vendor_id=b.vendor_id,
            vendor_name=b.vendor.vendor_name if b.vendor else "Vendor",
            resident_id=b.resident_id,
            unit_id=b.unit_id,
            unit_number=b.unit.unit_number if b.unit else None,
            booking_date=b.booking_date,
            time_slot=b.time_slot,
            notes=b.notes,
            gate_pass_code=b.gate_pass_code,
            status=b.status,
            created_at=b.created_at,
        )
        for b in bookings
    ]
