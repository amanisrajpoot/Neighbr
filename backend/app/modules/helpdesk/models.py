import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
    Boolean,
    Integer,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class HelpdeskTicket(Base):
    __tablename__ = "helpdesk_tickets"
    __table_args__ = (
        Index("idx_tickets_society_status", "society_id", "status"),
        Index("idx_tickets_unit", "unit_id"),
        Index("idx_tickets_created_by", "created_by"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    category: Mapped[str] = mapped_column(String(50), nullable=False)  # plumbing, electrical, carpentry, housekeeping, lift, common_area, security
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # low, normal, high, urgent
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    images: Mapped[list[str]] = mapped_column(JSON, default=list)

    status: Mapped[str] = mapped_column(String(30), default="OPEN")  # OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, REOPENED
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by], lazy="selectin")
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_to], lazy="selectin")
    unit: Mapped["Unit | None"] = relationship("Unit", lazy="selectin")
    comments: Mapped[list["TicketComment"]] = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan", lazy="selectin")

class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("helpdesk_tickets.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket: Mapped["HelpdeskTicket"] = relationship("HelpdeskTicket", back_populates="comments")
    author: Mapped["User"] = relationship("User", lazy="selectin")

from app.modules.auth.models import User
from app.modules.societies.models import Unit
