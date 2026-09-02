from fastapi import Depends
from app.middleware.tenancy import require_roles

RequireIoTAdmin = Depends(require_roles(["society_admin", "super_admin", "security_supervisor"]))
