from fastapi import Depends
from app.middleware.tenancy import require_permission, require_society_membership

RequireAmenitiesAdmin = Depends(require_permission("amenities:manage", fallback_roles=["society_admin", "super_admin", "committee"]))
RequireResident = Depends(require_society_membership)
