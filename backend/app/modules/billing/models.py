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
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Invoice(Base):
    __tablename__ = "billing_invoices"
    __table_args__ = (
        Index("idx_invoice_society_status", "society_id", "status"),
        Index("idx_invoice_unit", "unit_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False)

    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    billing_period: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "August 2026"
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    tax_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    penalty_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    paid_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)

    status: Mapped[str] = mapped_column(String(20), default="UNPAID")  # UNPAID, PAID, OVERDUE, PARTIAL
    line_items: Mapped[list[dict]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    unit: Mapped["Unit"] = relationship("Unit", lazy="selectin")
    transactions: Mapped[list["PaymentTransaction"]] = relationship("PaymentTransaction", back_populates="invoice", cascade="all, delete-orphan", lazy="selectin")

class PaymentTransaction(Base):
    __tablename__ = "billing_transactions"
    __table_args__ = (
        Index("idx_txn_society", "society_id"),
        Index("idx_txn_invoice", "invoice_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    society_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("societies.id", ondelete="CASCADE"), nullable=False)
    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("billing_invoices.id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    transaction_ref: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="UPI")  # UPI, CARD, NETBANKING
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="SUCCESS")  # SUCCESS, FAILED
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="transactions")
    user: Mapped["User"] = relationship("User", lazy="selectin")
    unit: Mapped["Unit"] = relationship("Unit", lazy="selectin")

from app.modules.auth.models import User
from app.modules.societies.models import Unit
