import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.automations.permissions import RequireAutomationAdmin
from app.modules.automations.schemas import RuleCreate, RuleOut, ToggleRuleRequest
from app.modules.automations.service import AutomationService

router = APIRouter(prefix="/societies/{society_id}/automations", tags=["Automations"])

@router.post("/rules", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(
    society_id: uuid.UUID,
    payload: RuleCreate,
    _auth = RequireAutomationAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = AutomationService(db)
    rule = await service.create_rule(society_id, payload)
    return RuleOut.model_validate(rule, from_attributes=True)

@router.get("/rules", response_model=list[RuleOut])
async def list_rules(
    society_id: uuid.UUID,
    _auth = RequireAutomationAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = AutomationService(db)
    rules = await service.list_rules(society_id)
    return [RuleOut.model_validate(r, from_attributes=True) for r in rules]

@router.patch("/rules/{rule_id}/toggle", response_model=RuleOut)
async def toggle_rule(
    society_id: uuid.UUID,
    rule_id: uuid.UUID,
    payload: ToggleRuleRequest,
    _auth = RequireAutomationAdmin,
    db: AsyncSession = Depends(get_db),
):
    service = AutomationService(db)
    rule = await service.toggle_rule(society_id, rule_id, payload.is_active)
    return RuleOut.model_validate(rule, from_attributes=True)
