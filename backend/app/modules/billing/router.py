import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.billing.permissions import RequireBillingAdmin, RequireResident
from app.modules.billing.schemas import (
    BatchInvoiceCreate,
    PayInvoiceRequest,
    InvoiceOut,
    TransactionOut,
    LedgerSummary,
)
from app.modules.billing.service import BillingService

router = APIRouter(prefix="/societies/{society_id}/billing", tags=["Society Billing & Maintenance"])

def _format_invoice(inv) -> InvoiceOut:
    return InvoiceOut(
        id=inv.id,
        society_id=inv.society_id,
        unit_id=inv.unit_id,
        unit_number=inv.unit.unit_number if inv.unit else None,
        invoice_number=inv.invoice_number,
        billing_period=inv.billing_period,
        due_date=inv.due_date,
        subtotal=float(inv.subtotal),
        tax_amount=float(inv.tax_amount),
        penalty_amount=float(inv.penalty_amount),
        total_amount=float(inv.total_amount),
        paid_amount=float(inv.paid_amount),
        status=inv.status,
        line_items=inv.line_items or [],
        created_at=inv.created_at,
        paid_at=inv.paid_at,
        transactions=[
            TransactionOut(
                id=t.id,
                society_id=t.society_id,
                invoice_id=t.invoice_id,
                unit_id=t.unit_id,
                user_id=t.user_id,
                user_name=t.user.full_name if t.user else None,
                transaction_ref=t.transaction_ref,
                receipt_number=t.receipt_number,
                payment_method=t.payment_method,
                amount=float(t.amount),
                status=t.status,
                paid_at=t.paid_at,
            )
            for t in inv.transactions
        ],
    )

@router.post("/invoices/generate-batch", response_model=list[InvoiceOut], status_code=status.HTTP_201_CREATED)
async def generate_batch_invoices(
    society_id: uuid.UUID,
    payload: BatchInvoiceCreate,
    author: User = Depends(get_current_user),
    _auth = RequireBillingAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    invoices = await service.generate_batch_invoices(society_id, payload, author)
    full_invoices = await service.list_invoices(society_id)
    return [_format_invoice(i) for i in full_invoices]

@router.get("/invoices", response_model=list[InvoiceOut])
async def list_invoices(
    society_id: uuid.UUID,
    unit_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    invoices = await service.list_invoices(society_id, unit_id=unit_id, status_filter=status_filter)
    return [_format_invoice(i) for i in invoices]

@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(
    society_id: uuid.UUID,
    invoice_id: uuid.UUID,
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    invoice = await service.get_invoice(society_id, invoice_id)
    return _format_invoice(invoice)

@router.post("/invoices/{invoice_id}/pay", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def pay_invoice(
    society_id: uuid.UUID,
    invoice_id: uuid.UUID,
    payload: PayInvoiceRequest,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    t = await service.pay_invoice(society_id, invoice_id, payload, user)
    return TransactionOut(
        id=t.id,
        society_id=t.society_id,
        invoice_id=t.invoice_id,
        unit_id=t.unit_id,
        user_id=t.user_id,
        user_name=user.full_name,
        transaction_ref=t.transaction_ref,
        receipt_number=t.receipt_number,
        payment_method=t.payment_method,
        amount=float(t.amount),
        status=t.status,
        paid_at=t.paid_at,
    )

@router.get("/ledger", response_model=LedgerSummary)
async def get_ledger_summary(
    society_id: uuid.UUID,
    _auth = RequireBillingAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.get_ledger_summary(society_id)
