import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.core.events import event_bus, DomainEvent
from app.modules.automations.models import AutomationRule
from app.modules.automations.repository import AutomationRepository
from app.modules.automations.events import AUTOMATION_RULE_CREATED, AUTOMATION_RULE_TOGGLED
from app.modules.automations.schemas import RuleCreate

class AutomationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AutomationRepository(db)

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
        await self.repo.save(rule)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id="SYSTEM",
                event_type=AUTOMATION_RULE_CREATED,
                entity_type="automation_rule",
                entity_id=str(rule.id),
                payload={"rule_name": rule.name, "trigger_event": rule.trigger_event},
            )
        )
        return rule

    async def list_rules(self, society_id: uuid.UUID) -> list[AutomationRule]:
        return await self.repo.list_rules(society_id)

    async def toggle_rule(self, society_id: uuid.UUID, rule_id: uuid.UUID, is_active: bool) -> AutomationRule:
        rule = await self.repo.get_rule(society_id, rule_id)
        if not rule:
            raise AppException(code="RULE_NOT_FOUND", message="Automation rule not found", status_code=404)

        rule.is_active = is_active
        await self.repo.commit()
        await self.db.refresh(rule)

        await event_bus.publish(
            DomainEvent(
                society_id=str(society_id),
                actor_user_id="SYSTEM",
                event_type=AUTOMATION_RULE_TOGGLED,
                entity_type="automation_rule",
                entity_id=str(rule.id),
                payload={"rule_name": rule.name, "is_active": is_active},
            )
        )
        return rule
