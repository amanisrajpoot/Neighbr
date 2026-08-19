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
from app.modules.societies.models import JSONType, Society

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("idx_notification_recipient", "recipient_user_id", "is_read"),
        Index("idx_notification_society", "society_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=True)
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="visitor")  # visitor, security, notice, system
    action_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    action_data: Mapped[dict] = mapped_column(JSONType, default=dict)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    recipient: Mapped["User"] = relationship("User", lazy="selectin")
    deliveries: Mapped[list["NotificationDelivery"]] = relationship("NotificationDelivery", back_populates="notification", cascade="all, delete-orphan")

class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="push")  # push, sms, email, whatsapp
    status: Mapped[str] = mapped_column(String(20), default="sent")  # pending, sent, delivered, failed
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    notification: Mapped["Notification"] = relationship("Notification", back_populates="deliveries")
