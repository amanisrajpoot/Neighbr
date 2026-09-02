import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.societies.models import Unit
from app.modules.billing.models import Invoice, PaymentTransaction

class BillingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_units(self, society_id: uuid.UUID) -> List[Unit]:
        res = await self.db.execute(select(Unit).where(Unit.society_id == society_id))
        return list(res.scalars().all())

    async def get_invoice(self, society_id: uuid.UUID, invoice_id: uuid.UUID) -> Optional[Invoice]:
        res = await self.db.execute(
            select(Invoice)
            .where(Invoice.id == invoice_id, Invoice.society_id == society_id)
            .options(
                selectinload(Invoice.unit),
                selectinload(Invoice.transactions).selectinload(PaymentTransaction.user),
            )
        )
        return res.scalar_one_or_none()

    async def list_invoices(
        self, society_id: uuid.UUID, unit_id: Optional[uuid.UUID] = None, status_filter: Optional[str] = None
    ) -> List[Invoice]:
        query = (
            select(Invoice)
            .where(Invoice.society_id == society_id)
            .options(
                selectinload(Invoice.unit),
                selectinload(Invoice.transactions).selectinload(PaymentTransaction.user),
            )
        )
        if unit_id:
            query = query.where(Invoice.unit_id == unit_id)
        if status_filter:
            query = query.where(Invoice.status == status_filter.upper())

        query = query.order_by(Invoice.created_at.desc())
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def get_all_invoices(self, society_id: uuid.UUID) -> List[Invoice]:
        res = await self.db.execute(
            select(Invoice).where(Invoice.society_id == society_id)
        )
        return list(res.scalars().all())

    def add(self, obj) -> None:
        self.db.add(obj)

    async def commit(self) -> None:
        await self.db.commit()

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
