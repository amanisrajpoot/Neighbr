import uuid
from datetime import datetime, date, timezone
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    Date,
    Integer,
    Numeric,
    ForeignKey,
    UniqueConstraint,
    Index,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.modules.auth.models import User, Role

# Cross-dialect JSON (JSONB on PostgreSQL, JSON on SQLite)
JSONType = JSON().with_variant(JSONB, "postgresql")

class Society(Base):
    __tablename__ = "societies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    country: Mapped[str] = mapped_column(String(50), default="IN")
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    total_units: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    settings: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    buildings: Mapped[list["Building"]] = relationship("Building", back_populates="society", cascade="all, delete-orphan")
    memberships: Mapped[list["UnitMembership"]] = relationship("UnitMembership", back_populates="society", cascade="all, delete-orphan")
    structured_settings: Mapped["SocietySettings"] = relationship("SocietySettings", back_populates="society", uselist=False, cascade="all, delete-orphan")

class SocietySettings(Base):
    __tablename__ = "society_settings"

    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), primary_key=True)
    visitor_approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    visitor_photo_required: Mapped[bool] = mapped_column(Boolean, default=False)
    delivery_auto_approve: Mapped[bool] = mapped_column(Boolean, default=False)
    cab_auto_approve: Mapped[bool] = mapped_column(Boolean, default=False)
    pass_default_duration_hours: Mapped[int] = mapped_column(Integer, default=24)
    max_pass_duration_hours: Mapped[int] = mapped_column(Integer, default=168)
    guard_offline_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    emergency_contacts: Mapped[list] = mapped_column(JSONType, default=list)
    working_hours: Mapped[dict] = mapped_column(JSONType, default=dict)
    notification_rules: Mapped[dict] = mapped_column(JSONType, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    society: Mapped["Society"] = relationship("Society", back_populates="structured_settings")

class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    total_floors: Mapped[int] = mapped_column(Integer, default=0)
    total_units: Mapped[int] = mapped_column(Integer, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    society: Mapped["Society"] = relationship("Society", back_populates="buildings")
    floors: Mapped[list["Floor"]] = relationship("Floor", back_populates="building", cascade="all, delete-orphan")
    units: Mapped[list["Unit"]] = relationship("Unit", back_populates="building", cascade="all, delete-orphan")

class Floor(Base):
    __tablename__ = "floors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("buildings.id", ondelete="CASCADE"), index=True, nullable=False)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    building: Mapped["Building"] = relationship("Building", back_populates="floors")
    units: Mapped[list["Unit"]] = relationship("Unit", back_populates="floor")

class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (
        UniqueConstraint("society_id", "building_id", "unit_number", name="uq_society_building_unit"),
        Index("idx_unit_society", "society_id"),
        Index("idx_unit_building", "building_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    building_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    floor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("floors.id", ondelete="SET NULL"), nullable=True)
    unit_number: Mapped[str] = mapped_column(String(20), nullable=False)
    unit_type: Mapped[str] = mapped_column(String(20), default="apartment")
    area_sqft: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_occupied: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    building: Mapped["Building"] = relationship("Building", back_populates="units")
    floor: Mapped["Floor"] = relationship("Floor", back_populates="units")
    memberships: Mapped[list["UnitMembership"]] = relationship("UnitMembership", back_populates="unit")

class UnitMembership(Base):
    __tablename__ = "unit_memberships"
    __table_args__ = (
        Index("idx_membership_society_active", "society_id", "is_active"),
        Index("idx_membership_user_active", "user_id", "is_active"),
        Index("idx_membership_unit_active", "unit_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=True)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    membership_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    society: Mapped["Society"] = relationship("Society", back_populates="memberships")
    unit: Mapped["Unit"] = relationship("Unit", back_populates="memberships", lazy="selectin")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="selectin")
    approved_by_user: Mapped["User | None"] = relationship("User", foreign_keys=[approved_by])
    role: Mapped["Role"] = relationship("Role", lazy="selectin")
    family_members: Mapped[list["FamilyMember"]] = relationship("FamilyMember", back_populates="membership", cascade="all, delete-orphan")

class ResidentProfile(Base):
    __tablename__ = "resident_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", "society_id", name="uq_user_society_resident_profile"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    move_in_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    parking_slots: Mapped[list] = mapped_column(JSONType, default=list)
    preferences: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    membership_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("unit_memberships.id", ondelete="CASCADE"), nullable=False)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    relation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    age_group: Mapped[str | None] = mapped_column(String(20), default="adult")
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    membership: Mapped["UnitMembership"] = relationship("UnitMembership", back_populates="family_members")
