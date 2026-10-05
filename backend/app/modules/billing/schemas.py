import uuid
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from typing import Any

class LineItem(BaseModel):
    title: str
    amount: float
    category: str = "maintenance"

class BatchInvoiceCreate(BaseModel):
    billing_period: str
    due_date: date
    base_maintenance: float = 2500.0
    sinking_fund: float = 500.0
    water_charges: float = 350.0

class PayInvoiceRequest(BaseModel):
    payment_method: str = "UPI"  # UPI, CARD, NETBANKING
    amount: float | None = None

class PaymentInitiateRequest(BaseModel):
    amount: float | None = None
    return_url: str | None = None

class PaymentInitiateResponse(BaseModel):
    invoice_id: uuid.UUID
    order_id: str
    cf_order_id: str | None = None
    payment_session_id: str
    order_amount: float
    order_currency: str = "INR"
    customer_name: str
    customer_phone: str

class PaymentVerifyRequest(BaseModel):
    order_id: str
    payment_method: str = "UPI"
    payment_ref: str | None = None

class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    invoice_id: uuid.UUID
    unit_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    transaction_ref: str
    receipt_number: str
    payment_method: str
    amount: float
    status: str
    paid_at: datetime

class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    society_id: uuid.UUID
    unit_id: uuid.UUID
    unit_number: str | None = None
    invoice_number: str
    billing_period: str
    due_date: date
    subtotal: float
    tax_amount: float
    penalty_amount: float
    total_amount: float
    paid_amount: float
    status: str
    cashfree_order_id: str | None = None
    payment_session_id: str | None = None
    line_items: list[dict] = []
    created_at: datetime
    paid_at: datetime | None = None
    transactions: list[TransactionOut] = []

class LedgerSummary(BaseModel):
    total_billed: float
    total_collected: float
    total_outstanding: float
    collection_rate_pct: float
    total_invoices: int
    paid_invoices: int
    overdue_invoices: int

