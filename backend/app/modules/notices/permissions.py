from fastapi import Depends
from app.middleware.tenancy import require_permission, require_roles, require_society_membership

RequireNoticeAdmin = Depends(require_permission("notices:publish", fallback_roles=["society_admin", "super_admin", "committee"]))
RequireSOSResolver = Depends(require_roles(["society_admin", "super_admin", "guard", "security_supervisor"]))
RequireResident = Depends(require_society_membership)
