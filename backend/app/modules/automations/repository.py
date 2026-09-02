import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.automations.models import AutomationRule

class AutomationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_rule(self, society_id: uuid.UUID, rule_id: uuid.UUID) -> Optional[AutomationRule]:
        res = await self.db.execute(
            select(AutomationRule).where(
                AutomationRule.id == rule_id, AutomationRule.society_id == society_id
            )
        )
        return res.scalar_one_or_none()

    async def list_rules(self, society_id: uuid.UUID) -> List[AutomationRule]:
        res = await self.db.execute(
            select(AutomationRule)
            .where(AutomationRule.society_id == society_id)
            .order_by(AutomationRule.created_at.desc())
        )
        return list(res.scalars().all())

    async def save(self, obj) -> None:
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)

    async def commit(self) -> None:
        await self.db.commit()
