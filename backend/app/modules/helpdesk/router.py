import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.auth.models import User
from app.modules.helpdesk.schemas import (
    TicketCreate,
    TicketOut,
    TicketStatusUpdate,
    TicketRate,
    CommentCreate,
    CommentOut,
)
from app.modules.helpdesk.service import HelpdeskService

router = APIRouter(prefix="/societies/{society_id}/helpdesk", tags=["Helpdesk & Maintenance"])

def _format_ticket(ticket) -> TicketOut:
    return TicketOut(
        id=ticket.id,
        society_id=ticket.society_id,
        unit_id=ticket.unit_id,
        unit_number=ticket.unit.unit_number if ticket.unit else None,
        created_by=ticket.created_by,
        creator_name=ticket.creator.full_name if ticket.creator else None,
        assigned_to=ticket.assigned_to,
        assignee_name=ticket.assignee.full_name if ticket.assignee else None,
        category=ticket.category,
        priority=ticket.priority,
        title=ticket.title,
        description=ticket.description,
        images=ticket.images or [],
        status=ticket.status,
        resolution_notes=ticket.resolution_notes,
        rating=ticket.rating,
        feedback=ticket.feedback,
        sla_due_at=ticket.sla_due_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        comments=[
            CommentOut(
                id=c.id,
                ticket_id=c.ticket_id,
                author_id=c.author_id,
                author_name=c.author.full_name if c.author else "Staff",
                message=c.message,
                is_internal=c.is_internal,
                created_at=c.created_at,
            )
            for c in ticket.comments
        ],
    )

@router.post("/tickets", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    society_id: uuid.UUID,
    payload: TicketCreate,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = HelpdeskService(db)
    ticket = await service.create_ticket(society_id, payload, user)
    full_ticket = await service.get_ticket(society_id, ticket.id)
    return _format_ticket(full_ticket)

@router.get("/tickets", response_model=list[TicketOut])
async def list_tickets(
    society_id: uuid.UUID,
    unit_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = HelpdeskService(db)
    tickets = await service.list_tickets(society_id, unit_id=unit_id, user_id=user_id, status_filter=status_filter)
    return [_format_ticket(t) for t in tickets]

@router.get("/tickets/{ticket_id}", response_model=TicketOut)
async def get_ticket(
    society_id: uuid.UUID,
    ticket_id: uuid.UUID,
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = HelpdeskService(db)
    ticket = await service.get_ticket(society_id, ticket_id)
    return _format_ticket(ticket)

@router.patch("/tickets/{ticket_id}/status", response_model=TicketOut)
async def update_ticket_status(
    society_id: uuid.UUID,
    ticket_id: uuid.UUID,
    payload: TicketStatusUpdate,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = HelpdeskService(db)
    ticket = await service.update_status(society_id, ticket_id, payload, user)
    return _format_ticket(ticket)

@router.post("/tickets/{ticket_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    society_id: uuid.UUID,
    ticket_id: uuid.UUID,
    payload: CommentCreate,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = HelpdeskService(db)
    comment = await service.add_comment(society_id, ticket_id, payload, user)
    return CommentOut(
        id=comment.id,
        ticket_id=comment.ticket_id,
        author_id=comment.author_id,
        author_name=user.full_name,
        message=comment.message,
        is_internal=comment.is_internal,
        created_at=comment.created_at,
    )

@router.post("/tickets/{ticket_id}/rate", response_model=TicketOut)
async def rate_ticket(
    society_id: uuid.UUID,
    ticket_id: uuid.UUID,
    payload: TicketRate,
    user: User = Depends(get_current_user),
    _mem = Depends(require_society_membership),
    db: AsyncSession = Depends(get_db),
):
    service = HelpdeskService(db)
    ticket = await service.rate_ticket(society_id, ticket_id, payload, user)
    return _format_ticket(ticket)
