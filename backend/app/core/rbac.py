from uuid import UUID
from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.societies.models import SocietyMembership

class RequireRole:
    def __init__(self, *roles: str):
        self.roles = set(roles)

    async def __call__(
        self,
        society_id: UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> SocietyMembership:
        result = await db.execute(
            select(SocietyMembership).where(
                SocietyMembership.society_id == society_id,
                SocietyMembership.user_id == current_user.id,
                SocietyMembership.is_active.is_(True),
            )
        )
        membership = result.scalar_one_or_none()
        
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this society")
            
        if self.roles and membership.role not in self.roles:
            raise HTTPException(status_code=403, detail=f"Requires one of these roles: {self.roles}")
            
        return membership
