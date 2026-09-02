from fastapi import Depends
from app.middleware.tenancy import require_roles

RequireAuditAdmin = Depends(require_roles(["society_admin", "super_admin", "security_supervisor"]))
