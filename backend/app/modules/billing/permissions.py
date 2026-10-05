from fastapi import Depends
from app.middleware.tenancy import require_permission, require_society_membership

RequireBillingAdmin = Depends(require_permission("billing:manage", fallback_roles=["society_admin", "super_admin"]))
RequireResident = Depends(require_society_membership)
