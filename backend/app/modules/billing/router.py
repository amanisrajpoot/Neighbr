import json
import uuid
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.core.errors import AppException
from app.core.payments import cashfree_service
from app.modules.auth.models import User
from app.modules.billing.permissions import RequireBillingAdmin, RequireResident
from app.modules.billing.schemas import (
    BatchInvoiceCreate,
    PayInvoiceRequest,
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentVerifyRequest,
    InvoiceOut,
    TransactionOut,
    LedgerSummary,
)
from app.modules.billing.service import BillingService

router = APIRouter(prefix="/societies/{society_id}/billing", tags=["Society Billing & Maintenance"])
webhook_router = APIRouter(prefix="/billing", tags=["Billing Webhooks"])

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
        cashfree_order_id=inv.cashfree_order_id,
        payment_session_id=inv.payment_session_id,
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

@router.post("/invoices/{invoice_id}/initiate-payment", response_model=PaymentInitiateResponse, status_code=status.HTTP_200_OK)
async def initiate_payment(
    society_id: uuid.UUID,
    invoice_id: uuid.UUID,
    payload: PaymentInitiateRequest,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.initiate_payment(society_id, invoice_id, payload, user)

@router.post("/invoices/{invoice_id}/verify-payment", response_model=TransactionOut, status_code=status.HTTP_200_OK)
async def verify_payment(
    society_id: uuid.UUID,
    invoice_id: uuid.UUID,
    payload: PaymentVerifyRequest,
    user: User = Depends(get_current_user),
    _auth = RequireResident,
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    t = await service.complete_payment_from_order(
        order_id=payload.order_id,
        payment_method=payload.payment_method,
        payment_ref=payload.payment_ref,
        user_id=user.id,
    )
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

@webhook_router.post("/webhook/cashfree")
async def cashfree_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    raw_body = await request.body()
    signature = request.headers.get("x-webhook-signature", "")
    timestamp = request.headers.get("x-webhook-timestamp", "")

    if not cashfree_service.verify_webhook_signature(raw_body, timestamp, signature):
        raise AppException(code="INVALID_SIGNATURE", message="Invalid Cashfree webhook signature", status_code=400)

    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        raise AppException(code="INVALID_PAYLOAD", message="Invalid JSON payload", status_code=400)

    data = payload.get("data", {})
    order = data.get("order", {})
    payment = data.get("payment", {})

    order_id = order.get("order_id") or data.get("order_id")
    payment_status = payment.get("payment_status", "").upper()

    if order_id and payment_status in ("SUCCESS", "PAID"):
        service = BillingService(db)
        amount = float(payment.get("payment_amount", 0.0)) or None
        payment_method = payment.get("payment_group", "ONLINE")
        payment_ref = payment.get("cf_payment_id") or payment.get("bank_reference")
        await service.complete_payment_from_order(
            order_id=order_id,
            payment_method=payment_method,
            payment_ref=str(payment_ref) if payment_ref else None,
            amount=amount,
        )

    return {"status": "ok"}

