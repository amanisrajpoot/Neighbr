import uuid
from datetime import datetime, time, date, timezone
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    Date,
    Time,
    ForeignKey,
    UniqueConstraint,
    Index,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.modules.auth.models import User, UserDevice
from app.modules.societies.models import JSONType, Society

class Gate(Base):
    __tablename__ = "gates"
    __table_args__ = (
        Index("idx_gate_society", "society_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gate_type: Mapped[str] = mapped_column(String(20), default="entry_exit")  # entry, exit, entry_exit
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    settings: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    society: Mapped["Society"] = relationship("Society")
    assignments: Mapped[list["GuardAssignment"]] = relationship("GuardAssignment", back_populates="gate")

class GuardProfile(Base):
    __tablename__ = "guard_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", "society_id", name="uq_guard_user_society"),
        Index("idx_guard_society", "society_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    employee_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    id_proof_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    id_proof_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", lazy="selectin")
    society: Mapped["Society"] = relationship("Society")
    assignments: Mapped[list["GuardAssignment"]] = relationship("GuardAssignment", back_populates="guard")
    devices: Mapped[list["GuardDevice"]] = relationship("GuardDevice", back_populates="guard")

class GuardShift(Base):
    __tablename__ = "guard_shifts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class GuardAssignment(Base):
    __tablename__ = "guard_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("guard_profiles.id", ondelete="CASCADE"), nullable=False)
    gate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("gates.id", ondelete="CASCADE"), nullable=False)
    shift_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("guard_shifts.id", ondelete="SET NULL"), nullable=True)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True, nullable=False)
    assigned_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    guard: Mapped["GuardProfile"] = relationship("GuardProfile", back_populates="assignments", lazy="selectin")
    gate: Mapped["Gate"] = relationship("Gate", back_populates="assignments", lazy="selectin")
    shift: Mapped["GuardShift | None"] = relationship("GuardShift", lazy="selectin")

class GuardDevice(Base):
    __tablename__ = "guard_devices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("guard_profiles.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user_devices.id", ondelete="CASCADE"), nullable=False)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True, nullable=False)
    is_authorized: Mapped[bool] = mapped_column(Boolean, default=True)
    authorized_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    authorized_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    guard: Mapped["GuardProfile"] = relationship("GuardProfile", back_populates="devices")
    device: Mapped["UserDevice"] = relationship("UserDevice", lazy="selectin")

class GuardAttendance(Base):
    __tablename__ = "guard_attendance"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("guard_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    gate_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("gates.id", ondelete="SET NULL"), nullable=True)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), index=True, nullable=False)
    check_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_in_location: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    check_out_location: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="on_duty")  # on_duty, off_duty, break
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    guard: Mapped["GuardProfile"] = relationship("GuardProfile", lazy="selectin")
    gate: Mapped["Gate | None"] = relationship("Gate", lazy="selectin")
