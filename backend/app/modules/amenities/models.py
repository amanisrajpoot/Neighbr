import uuid
from datetime import datetime, timezone, date, time
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Date,
    Time,
    ForeignKey,
    Index,
    Boolean,
    Integer,
    Numeric,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Amenity(Base):
    __tablename__ = "amenities"
    __table_args__ = (
        Index("idx_amenity_society_active", "society_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False)  # TENNIS-1, POOL, BANQUET, GYM, BADMINTON
    category: Mapped[str] = mapped_column(String(50), default="sports")  # sports, wellness, leisure, events
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    capacity_per_slot: Mapped[int] = mapped_column(Integer, default=4)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    open_time: Mapped[str] = mapped_column(String(10), default="06:00")  # HH:MM format
    close_time: Mapped[str] = mapped_column(String(10), default="22:00")
    rules: Mapped[list[str]] = mapped_column(JSON, default=list)

    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    price_per_slot: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    bookings: Mapped[list["AmenityBooking"]] = relationship("AmenityBooking", back_populates="amenity", cascade="all, delete-orphan")

class AmenityBooking(Base):
    __tablename__ = "amenity_bookings"
    __table_args__ = (
        Index("idx_booking_amenity_date", "amenity_id", "booking_date"),
        Index("idx_booking_society_unit", "society_id", "unit_id"),
        Index("idx_booking_user", "booked_by"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    amenity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("amenities.id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    booked_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    booking_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g. "07:00"
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)    # e.g. "08:00"
    guest_count: Mapped[int] = mapped_column(Integer, default=1)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)

    status: Mapped[str] = mapped_column(String(20), default="CONFIRMED")  # CONFIRMED, CANCELLED, COMPLETED
    qr_pass: Mapped[str] = mapped_column(String(100), nullable=False)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    amenity: Mapped["Amenity"] = relationship("Amenity", back_populates="bookings", lazy="selectin")
    user: Mapped["User"] = relationship("User", foreign_keys=[booked_by], lazy="selectin")
    unit: Mapped["Unit | None"] = relationship("Unit", lazy="selectin")

from app.modules.auth.models import User
from app.modules.societies.models import Unit
