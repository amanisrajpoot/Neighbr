import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
    Boolean,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class IoTDevice(Base):
    __tablename__ = "iot_devices"
    __table_args__ = (
        Index("idx_iot_society_type", "society_id", "device_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    gate_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("gates.id", ondelete="SET NULL"), nullable=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)  # BOOM_BARRIER, RFID_READER, ANPR_CAMERA, BLE_BEACON
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ONLINE")  # ONLINE, OFFLINE, DEGRADED
    firmware_version: Mapped[str] = mapped_column(String(50), default="v2.4.1")
    last_heartbeat_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    commands: Mapped[list["DeviceCommandLog"]] = relationship("DeviceCommandLog", back_populates="device", cascade="all, delete-orphan", lazy="selectin")

class DeviceCommandLog(Base):
    __tablename__ = "iot_device_command_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("iot_devices.id", ondelete="CASCADE"), nullable=False)
    command: Mapped[str] = mapped_column(String(50), nullable=False)  # OPEN_BARRIER, CLOSE_BARRIER, REBOOT, SYNC_WHITELIST
    triggered_by: Mapped[str] = mapped_column(String(100), default="ADMIN_DASHBOARD")
    status: Mapped[str] = mapped_column(String(20), default="EXECUTED")  # EXECUTED, FAILED
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    device: Mapped["IoTDevice"] = relationship("IoTDevice", back_populates="commands")
