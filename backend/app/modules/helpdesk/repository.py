import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.helpdesk.models import HelpdeskTicket, TicketComment

class HelpdeskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_ticket(self, society_id: uuid.UUID, ticket_id: uuid.UUID) -> Optional[HelpdeskTicket]:
        res = await self.db.execute(
            select(HelpdeskTicket)
            .where(HelpdeskTicket.id == ticket_id, HelpdeskTicket.society_id == society_id)
            .options(
                selectinload(HelpdeskTicket.creator),
                selectinload(HelpdeskTicket.assignee),
                selectinload(HelpdeskTicket.unit),
                selectinload(HelpdeskTicket.comments).selectinload(TicketComment.author),
            )
        )
        return res.scalar_one_or_none()

    async def list_tickets(
        self, society_id: uuid.UUID, unit_id: Optional[uuid.UUID] = None, user_id: Optional[uuid.UUID] = None, status_filter: Optional[str] = None
    ) -> List[HelpdeskTicket]:
        query = (
            select(HelpdeskTicket)
            .where(HelpdeskTicket.society_id == society_id)
            .options(
                selectinload(HelpdeskTicket.creator),
                selectinload(HelpdeskTicket.assignee),
                selectinload(HelpdeskTicket.unit),
                selectinload(HelpdeskTicket.comments).selectinload(TicketComment.author),
            )
        )
        if unit_id:
            query = query.where(HelpdeskTicket.unit_id == unit_id)
        if user_id:
            query = query.where(HelpdeskTicket.created_by == user_id)
        if status_filter:
            query = query.where(HelpdeskTicket.status == status_filter)

        query = query.order_by(HelpdeskTicket.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
