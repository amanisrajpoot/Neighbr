from fastapi import Depends
from app.middleware.tenancy import require_society_membership, require_roles

RequireResident = Depends(require_society_membership)
RequireAdmin = Depends(require_roles(["society_admin", "super_admin", "security_supervisor"]))
