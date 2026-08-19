import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.modules.auth.models import User
from app.modules.societies.models import JSONType, Society, Unit
from app.modules.gates.models import Gate, GuardProfile

class VisitorProfile(Base):
    __tablename__ = "visitor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str | None] = mapped_column(String(15), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    id_proof_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    id_proof_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

class VisitorPass(Base):
    __tablename__ = "visitor_passes"
    __table_args__ = (
        Index("idx_pass_society_status", "society_id", "status"),
        Index("idx_pass_unit_status", "unit_id", "status"),
        Index("idx_pass_qr_token", "qr_token"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False)
    visitor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("visitor_profiles.id", ondelete="SET NULL"), nullable=True)
    issued_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    pass_type: Mapped[str] = mapped_column(String(20), default="guest")  # guest, delivery, cab, service, staff, recurring
    visitor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    visitor_phone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    visitor_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gate_restriction: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("gates.id", ondelete="SET NULL"), nullable=True)
    qr_token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    qr_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_rule: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="CREATED")  # CREATED, INVITED, APPROVAL_PENDING, APPROVED, ARRIVED, CHECKED_IN, CHECKED_OUT, EXPIRED, CANCELLED, REJECTED
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    society: Mapped["Society"] = relationship("Society")
    unit: Mapped["Unit"] = relationship("Unit", lazy="selectin")
    visitor: Mapped["VisitorProfile | None"] = relationship("VisitorProfile", lazy="selectin")
    issuer: Mapped["User"] = relationship("User", foreign_keys=[issued_by], lazy="selectin")

class VisitorEvent(Base):
    __tablename__ = "visitor_events"
    __table_args__ = (
        Index("idx_visitor_event_society", "society_id", "occurred_at"),
        Index("idx_visitor_event_unit", "unit_id", "occurred_at"),
        Index("idx_visitor_event_gate", "gate_id", "occurred_at"),
        Index("idx_visitor_event_idempotency", "idempotency_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    pass_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("visitor_passes.id", ondelete="SET NULL"), nullable=True)
    visitor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("visitor_profiles.id", ondelete="SET NULL"), nullable=True)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    gate_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("gates.id", ondelete="SET NULL"), nullable=True)
    guard_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("guard_profiles.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)  # VISITOR_CHECKED_IN, VISITOR_CHECKED_OUT, etc.
    visitor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    visitor_phone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    visitor_photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    entry_method: Mapped[str | None] = mapped_column(String(20), default="qr")  # qr, manual, pre_approved
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_offline: Mapped[bool] = mapped_column(Boolean, default=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONType, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    pass_obj: Mapped["VisitorPass | None"] = relationship("VisitorPass", foreign_keys=[pass_id], lazy="selectin")
    unit: Mapped["Unit | None"] = relationship("Unit", foreign_keys=[unit_id], lazy="selectin")
    gate: Mapped["Gate | None"] = relationship("Gate", foreign_keys=[gate_id], lazy="selectin")

class Blacklist(Base):
    __tablename__ = "blacklists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)  # person, phone, vehicle
    entity_value: Mapped[str] = mapped_column(String(255), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    added_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
