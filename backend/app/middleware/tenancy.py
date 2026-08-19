import uuid
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.core.errors import AppException
from app.modules.auth.models import User
from app.modules.societies.models import UnitMembership

async def verify_society_access(
    society_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> UnitMembership | None:
    if user.is_platform_admin:
        return None

    result = await db.execute(
        select(UnitMembership)
        .where(
            UnitMembership.society_id == society_id,
            UnitMembership.user_id == user.id,
            UnitMembership.is_active.is_(True),
        )
        .options(selectinload(UnitMembership.role), selectinload(UnitMembership.unit))
    )
    membership = result.scalars().first()

    if not membership:
        raise AppException(
            code="FORBIDDEN_SOCIETY_ACCESS",
            message="You do not have active membership in this society",
            status_code=403,
        )

    return membership

async def require_society_membership(
    society_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UnitMembership | None:
    return await verify_society_access(society_id, user, db)

def require_roles(allowed_roles: list[str]):
    async def role_checker(
        membership: UnitMembership | None = Depends(require_society_membership),
        user: User = Depends(get_current_user),
    ):
        if user.is_platform_admin:
            return True
        if not membership or not membership.role or membership.role.code not in allowed_roles:
            raise AppException(
                code="INSUFFICIENT_PERMISSIONS",
                message=f"Action requires one of the following roles: {', '.join(allowed_roles)}",
                status_code=403,
            )
        return True
    return role_checker
