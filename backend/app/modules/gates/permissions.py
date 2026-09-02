from fastapi import Depends
from app.middleware.tenancy import require_roles

RequireGateAdmin = Depends(require_roles(["society_admin", "super_admin", "security_supervisor"]))
RequireGuard = Depends(require_roles(["guard", "society_admin", "security_supervisor"]))
