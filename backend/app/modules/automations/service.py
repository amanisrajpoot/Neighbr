import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.modules.automations.models import AutomationRule
from app.modules.automations.schemas import RuleCreate

class AutomationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_rule(self, society_id: uuid.UUID, payload: RuleCreate) -> AutomationRule:
        rule = AutomationRule(
            society_id=society_id,
            name=payload.name.strip(),
            description=payload.description,
            trigger_event=payload.trigger_event,
            conditions=payload.conditions,
            action_type=payload.action_type,
            action_payload=payload.action_payload,
            is_active=payload.is_active,
        )
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def list_rules(self, society_id: uuid.UUID) -> list[AutomationRule]:
        result = await self.db.execute(
            select(AutomationRule)
            .where(AutomationRule.society_id == society_id)
            .order_by(AutomationRule.created_at.desc())
        )
        return list(result.scalars().all())

    async def toggle_rule(self, society_id: uuid.UUID, rule_id: uuid.UUID, is_active: bool) -> AutomationRule:
        rule = await self.db.get(AutomationRule, rule_id)
        if not rule or rule.society_id != society_id:
            raise AppException(code="RULE_NOT_FOUND", message="Automation rule not found", status_code=404)

        rule.is_active = is_active
        await self.db.commit()
        await self.db.refresh(rule)
        return rule
