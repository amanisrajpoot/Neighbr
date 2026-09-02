from fastapi import Depends
from app.middleware.tenancy import require_roles

RequireSecurityGuard = Depends(require_roles(["security_guard", "security_supervisor", "society_admin", "super_admin"]))
