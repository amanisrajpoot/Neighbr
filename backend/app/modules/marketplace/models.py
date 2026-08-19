import uuid
from datetime import datetime, timezone, date
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Date,
    ForeignKey,
    Index,
    Boolean,
    Numeric,
    Integer,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"
    __table_args__ = (
        Index("idx_marketplace_society_cat", "society_id", "category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    seller_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="furniture")  # furniture, electronics, appliances, kids, vehicles, other
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False)
    images: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")  # ACTIVE, SOLD, RESERVED, REMOVED

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    seller: Mapped["User"] = relationship("User", foreign_keys=[seller_id], lazy="selectin")
    unit: Mapped["Unit | None"] = relationship("Unit", lazy="selectin")

class VendorService(Base):
    __tablename__ = "vendor_services"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)

    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # cleaning, plumbing, carpentry, pest_control, appliance_repair
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    rating: Mapped[float] = mapped_column(Numeric(3, 1), default=4.8)
    review_count: Mapped[int] = mapped_column(Integer, default=12)
    pricing_starts_at: Mapped[float] = mapped_column(Numeric(10, 2), default=299.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ServiceBooking(Base):
    __tablename__ = "service_bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendor_services.id", ondelete="CASCADE"), nullable=False)
    resident_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)

    booking_date: Mapped[date] = mapped_column(Date, nullable=False)
    time_slot: Mapped[str] = mapped_column(String(50), nullable=False)  # "10:00 AM - 12:00 PM"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    gate_pass_code: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="CONFIRMED")  # REQUESTED, CONFIRMED, COMPLETED, CANCELLED

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    vendor: Mapped["VendorService"] = relationship("VendorService", lazy="selectin")
    resident: Mapped["User"] = relationship("User", lazy="selectin")
    unit: Mapped["Unit | None"] = relationship("Unit", lazy="selectin")

from app.modules.auth.models import User
from app.modules.societies.models import Unit
