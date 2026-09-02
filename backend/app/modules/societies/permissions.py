from fastapi import Depends
from app.middleware.tenancy import require_society_membership, require_roles
from app.modules.societies.models import UnitMembership

RequireSocietyAdmin = Depends(require_roles(["society_admin", "super_admin"]))
RequireSocietyMember = Depends(require_society_membership)
