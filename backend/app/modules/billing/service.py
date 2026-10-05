import uuid
import secrets
from datetime import datetime, timezone, date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.core.payments import cashfree_service
from app.modules.auth.models import User
from app.modules.billing.models import Invoice, PaymentTransaction
from app.modules.billing.repository import BillingRepository
from app.modules.billing.events import (
    INVOICES_GENERATED,
    INVOICE_PAID,
)
from app.modules.billing.schemas import (
    BatchInvoiceCreate,
    PayInvoiceRequest,
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    LedgerSummary,
)

class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = BillingRepository(db)

    async def generate_batch_invoices(
        self, society_id: uuid.UUID, payload: BatchInvoiceCreate, author: User
    ) -> list[Invoice]:
        # Fetch all units in society
        units = await self.repo.get_units(society_id)
        if not units:
            raise AppException(code="NO_UNITS_FOUND", message="No residential units found in this society", status_code=400)

        created_invoices: list[Invoice] = []
        now_str = datetime.now().strftime("%Y%m")

        for u in units:
            inv_number = f"INV-{now_str}-{u.unit_number.replace(' ', '')}-{secrets.token_hex(2).upper()}"
            subtotal = payload.base_maintenance + payload.sinking_fund + payload.water_charges
            tax = round(subtotal * 0.05, 2)  # 5% GST
            total = subtotal + tax

            line_items = [
                {"title": "Monthly Society Maintenance", "amount": payload.base_maintenance, "category": "maintenance"},
                {"title": "Sinking & Asset Reserve Fund", "amount": payload.sinking_fund, "category": "reserve"},
                {"title": "Water & Sewage Utility Charges", "amount": payload.water_charges, "category": "utility"},
                {"title": "GST (5% Tax)", "amount": tax, "category": "tax"},
            ]

            invoice = Invoice(
                society_id=society_id,
                unit_id=u.id,
                invoice_number=inv_number,
                billing_period=payload.billing_period,
                due_date=payload.due_date,
                subtotal=subtotal,
                tax_amount=tax,
                total_amount=total,
                status="UNPAID",
                line_items=line_items,
            )
            self.repo.add(invoice)
            created_invoices.append(invoice)

        await self.repo.commit()

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(author.id),
                event_type=INVOICES_GENERATED,
                entity_type="billing_batch",
                payload={"count": len(created_invoices), "period": payload.billing_period},
            )
        )
        return created_invoices

    async def list_invoices(
        self, society_id: uuid.UUID, unit_id: uuid.UUID | None = None, status_filter: str | None = None
    ) -> list[Invoice]:
        return await self.repo.list_invoices(society_id, unit_id, status_filter)

    async def get_invoice(self, society_id: uuid.UUID, invoice_id: uuid.UUID) -> Invoice:
        invoice = await self.repo.get_invoice(society_id, invoice_id)
        if not invoice:
            raise AppException(code="INVOICE_NOT_FOUND", message="Invoice not found", status_code=404)
        return invoice

    async def pay_invoice(
        self, society_id: uuid.UUID, invoice_id: uuid.UUID, payload: PayInvoiceRequest, user: User
    ) -> PaymentTransaction:
        invoice = await self.get_invoice(society_id, invoice_id)
        if invoice.status == "PAID":
            raise AppException(code="ALREADY_PAID", message="Invoice is already fully paid", status_code=400)

        pay_amount = payload.amount or float(invoice.total_amount)
        txn_ref = f"TXN-{payload.payment_method}-{secrets.token_hex(4).upper()}"
        receipt_no = f"REC-{secrets.token_hex(3).upper()}"

        transaction = PaymentTransaction(
            society_id=society_id,
            invoice_id=invoice.id,
            unit_id=invoice.unit_id,
            user_id=user.id,
            transaction_ref=txn_ref,
            receipt_number=receipt_no,
            payment_method=payload.payment_method,
            amount=pay_amount,
            status="SUCCESS",
        )
        self.repo.add(transaction)

        invoice.paid_amount = float(invoice.paid_amount) + pay_amount
        if invoice.paid_amount >= float(invoice.total_amount):
            invoice.status = "PAID"
            invoice.paid_at = datetime.now(timezone.utc)
        else:
            invoice.status = "PARTIAL"

        await self.repo.commit()
        # Ensure transaction has generated id
        await self.db.refresh(transaction)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(user.id),
                event_type=INVOICE_PAID,
                entity_type="billing_transaction",
                entity_id=str(transaction.id),
                payload={"invoice_number": invoice.invoice_number, "amount": pay_amount},
            )
        )
        return transaction

    async def get_ledger_summary(self, society_id: uuid.UUID) -> LedgerSummary:
        invoices = await self.repo.get_all_invoices(society_id)

        total_billed = sum(float(i.total_amount) for i in invoices)
        total_collected = sum(float(i.paid_amount) for i in invoices)
        total_outstanding = max(0.0, total_billed - total_collected)
        pct = round((total_collected / total_billed * 100), 1) if total_billed > 0 else 0.0

        return LedgerSummary(
            total_billed=total_billed,
            total_collected=total_collected,
            total_outstanding=total_outstanding,
            collection_rate_pct=pct,
            total_invoices=len(invoices),
            paid_invoices=len([i for i in invoices if i.status == "PAID"]),
            overdue_invoices=len([i for i in invoices if i.status == "OVERDUE" or (i.status == "UNPAID" and i.due_date < date.today())]),
        )

    async def initiate_payment(
        self, society_id: uuid.UUID, invoice_id: uuid.UUID, payload: PaymentInitiateRequest, user: User
    ) -> PaymentInitiateResponse:
        invoice = await self.get_invoice(society_id, invoice_id)
        if invoice.status == "PAID":
            raise AppException(code="ALREADY_PAID", message="Invoice is already fully paid", status_code=400)

        unpaid_amount = max(0.0, float(invoice.total_amount) - float(invoice.paid_amount))
        amount_to_pay = payload.amount if (payload.amount and 0 < payload.amount <= unpaid_amount) else unpaid_amount
        if amount_to_pay <= 0:
            raise AppException(code="INVALID_AMOUNT", message="Payable amount must be greater than zero", status_code=400)

        order_id = f"CF-ORD-{invoice.invoice_number.replace('INV-', '')}-{secrets.token_hex(3).upper()}"

        cf_res = await cashfree_service.create_order(
            order_id=order_id,
            order_amount=amount_to_pay,
            customer_id=str(user.id),
            customer_phone=user.phone or "9999999999",
            customer_name=user.full_name or "Resident",
            return_url=payload.return_url,
        )

        invoice.cashfree_order_id = cf_res["order_id"]
        invoice.payment_session_id = cf_res["payment_session_id"]
        await self.repo.commit()

        return PaymentInitiateResponse(
            invoice_id=invoice.id,
            order_id=cf_res["order_id"],
            cf_order_id=cf_res.get("cf_order_id"),
            payment_session_id=cf_res["payment_session_id"],
            order_amount=amount_to_pay,
            order_currency="INR",
            customer_name=user.full_name or "Resident",
            customer_phone=user.phone or "9999999999",
        )

    async def complete_payment_from_order(
        self,
        order_id: str,
        payment_method: str = "ONLINE",
        payment_ref: str | None = None,
        amount: float | None = None,
        user_id: uuid.UUID | None = None,
    ) -> PaymentTransaction:
        invoice = await self.repo.get_invoice_by_order_id(order_id)
        if not invoice:
            raise AppException(code="INVOICE_NOT_FOUND", message=f"No invoice found for order_id {order_id}", status_code=404)

        if invoice.status == "PAID" and invoice.transactions:
            return invoice.transactions[0]

        pay_amount = amount or max(0.0, float(invoice.total_amount) - float(invoice.paid_amount))
        txn_ref = payment_ref or f"TXN-CF-{secrets.token_hex(4).upper()}"
        receipt_no = f"REC-{secrets.token_hex(3).upper()}"

        effective_user_id = user_id or (invoice.transactions[0].user_id if invoice.transactions else None)
        if not effective_user_id:
            if invoice.unit and invoice.unit.memberships:
                effective_user_id = invoice.unit.memberships[0].user_id
            else:
                effective_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

        transaction = PaymentTransaction(
            society_id=invoice.society_id,
            invoice_id=invoice.id,
            unit_id=invoice.unit_id,
            user_id=effective_user_id,
            transaction_ref=txn_ref,
            receipt_number=receipt_no,
            payment_method=payment_method,
            amount=pay_amount,
            status="SUCCESS",
        )
        self.repo.add(transaction)

        invoice.paid_amount = float(invoice.paid_amount) + pay_amount
        if invoice.paid_amount >= float(invoice.total_amount):
            invoice.status = "PAID"
            invoice.paid_at = datetime.now(timezone.utc)
        else:
            invoice.status = "PARTIAL"

        await self.repo.commit()
        await self.db.refresh(transaction)

        await event_bus.publish(
            DomainEvent(
                society_id=str(invoice.society_id),
                actor_user_id=str(effective_user_id),
                event_type=INVOICE_PAID,
                entity_type="billing_transaction",
                entity_id=str(transaction.id),
                payload={"invoice_number": invoice.invoice_number, "amount": pay_amount, "order_id": order_id},
            )
        )
        return transaction

