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

class AutomationRule(Base):
    __tablename__ = "automation_rules"
    __table_args__ = (
        Index("idx_automation_society_active", "society_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_event: Mapped[str] = mapped_column(String(100), nullable=False)  # VISITOR_CHECKED_IN, GATE_OFFLINE, BILL_DUE, SOS_TRIGGERED
    conditions: Mapped[dict] = mapped_column(JSON, default=dict)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)  # SEND_PUSH_NOTIFICATION, DISPATCH_SECURITY_ALERT, CREATE_HELPDESK_TICKET
    action_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
