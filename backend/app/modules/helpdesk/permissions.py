from fastapi import Depends
from app.middleware.tenancy import require_roles, require_society_membership

RequireHelpdeskStaff = Depends(require_roles(["society_admin", "super_admin", "staff", "committee", "facility_manager"]))
RequireResident = Depends(require_society_membership)
