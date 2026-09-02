import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.auth.models import User
from app.modules.helpdesk.models import HelpdeskTicket, TicketComment
from app.modules.helpdesk.repository import HelpdeskRepository
from app.modules.helpdesk.events import (
    TICKET_CREATED,
    TICKET_STATUS_UPDATED,
    TICKET_COMMENT_ADDED,
    TICKET_RATED,
)
from app.modules.helpdesk.schemas import (
    TicketCreate,
    TicketStatusUpdate,
    TicketRate,
    CommentCreate,
)

class HelpdeskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = HelpdeskRepository(db)

    async def create_ticket(
        self, society_id: uuid.UUID, payload: TicketCreate, creator: User
    ) -> HelpdeskTicket:
        # Calculate SLA based on priority
        sla_hours = 48
        if payload.priority == "urgent":
            sla_hours = 4
        elif payload.priority == "high":
            sla_hours = 12
        elif payload.priority == "normal":
            sla_hours = 24

        ticket = HelpdeskTicket(
            society_id=society_id,
            unit_id=payload.unit_id,
            created_by=creator.id,
            category=payload.category,
            priority=payload.priority,
            title=payload.title.strip(),
            description=payload.description.strip(),
            images=payload.images,
            status="OPEN",
            sla_due_at=datetime.now(timezone.utc) + timedelta(hours=sla_hours),
        )
        await self.repo.save(ticket)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(creator.id),
                event_type=TICKET_CREATED,
                entity_type="helpdesk_ticket",
                entity_id=str(ticket.id),
                payload={"title": ticket.title, "category": ticket.category, "priority": ticket.priority},
            )
        )
        return ticket

    async def list_tickets(
        self, society_id: uuid.UUID, unit_id: uuid.UUID | None = None, user_id: uuid.UUID | None = None, status_filter: str | None = None
    ) -> list[HelpdeskTicket]:
        return await self.repo.list_tickets(society_id, unit_id, user_id, status_filter)

    async def get_ticket(self, society_id: uuid.UUID, ticket_id: uuid.UUID) -> HelpdeskTicket:
        ticket = await self.repo.get_ticket(society_id, ticket_id)
        if not ticket:
            raise AppException(code="TICKET_NOT_FOUND", message="Helpdesk ticket not found", status_code=404)
        return ticket

    async def update_status(
        self, society_id: uuid.UUID, ticket_id: uuid.UUID, payload: TicketStatusUpdate, actor: User
    ) -> HelpdeskTicket:
        ticket = await self.get_ticket(society_id, ticket_id)
        ticket.status = payload.status.upper()
        if payload.resolution_notes:
            ticket.resolution_notes = payload.resolution_notes
        if payload.assigned_to:
            ticket.assigned_to = payload.assigned_to

        now = datetime.now(timezone.utc)
        if ticket.status == "RESOLVED":
            ticket.resolved_at = now
        elif ticket.status == "CLOSED":
            ticket.closed_at = now

        await self.repo.save(ticket)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(actor.id),
                event_type=TICKET_STATUS_UPDATED,
                entity_type="helpdesk_ticket",
                entity_id=str(ticket.id),
                payload={"status": ticket.status},
            )
        )
        return ticket

    async def add_comment(
        self, society_id: uuid.UUID, ticket_id: uuid.UUID, payload: CommentCreate, author: User
    ) -> TicketComment:
        ticket = await self.get_ticket(society_id, ticket_id)
        comment = TicketComment(
            ticket_id=ticket.id,
            author_id=author.id,
            message=payload.message.strip(),
            is_internal=payload.is_internal,
        )
        await self.repo.save(comment)
        
        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(author.id),
                event_type=TICKET_COMMENT_ADDED,
                entity_type="helpdesk_ticket",
                entity_id=str(ticket.id),
            )
        )
        return comment

    async def rate_ticket(
        self, society_id: uuid.UUID, ticket_id: uuid.UUID, payload: TicketRate, resident: User
    ) -> HelpdeskTicket:
        ticket = await self.get_ticket(society_id, ticket_id)
        if ticket.created_by != resident.id:
            raise AppException(code="FORBIDDEN", message="Only the ticket creator can rate resolution", status_code=403)
        ticket.rating = max(1, min(5, payload.rating))
        ticket.feedback = payload.feedback
        ticket.status = "CLOSED"
        ticket.closed_at = datetime.now(timezone.utc)

        await self.repo.save(ticket)
        
        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id=str(resident.id),
                event_type=TICKET_RATED,
                entity_type="helpdesk_ticket",
                entity_id=str(ticket.id),
                payload={"rating": ticket.rating},
            )
        )
        return ticket
