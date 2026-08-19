import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.tenancy import require_roles
from app.modules.automations.schemas import RuleCreate, RuleToggleRequest, AutomationRuleOut
from app.modules.automations.service import AutomationService

router = APIRouter(prefix="/societies/{society_id}/automations", tags=["Smart Society Automations"])

def _format_rule(r) -> AutomationRuleOut:
    return AutomationRuleOut(
        id=r.id,
        society_id=r.society_id,
        name=r.name,
        description=r.description,
        trigger_event=r.trigger_event,
        conditions=r.conditions or {},
        action_type=r.action_type,
        action_payload=r.action_payload or {},
        is_active=r.is_active,
        created_at=r.created_at,
    )

@router.post("/rules", response_model=AutomationRuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(
    society_id: uuid.UUID,
    payload: RuleCreate,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = AutomationService(db)
    r = await service.create_rule(society_id, payload)
    return _format_rule(r)

@router.get("/rules", response_model=list[AutomationRuleOut])
async def list_rules(
    society_id: uuid.UUID,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = AutomationService(db)
    rules = await service.list_rules(society_id)
    return [_format_rule(r) for r in rules]

@router.patch("/rules/{rule_id}/toggle", response_model=AutomationRuleOut)
async def toggle_rule(
    society_id: uuid.UUID,
    rule_id: uuid.UUID,
    payload: RuleToggleRequest,
    _auth = Depends(require_roles(["society_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    service = AutomationService(db)
    r = await service.toggle_rule(society_id, rule_id, payload.is_active)
    return _format_rule(r)
