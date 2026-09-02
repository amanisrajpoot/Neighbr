from fastapi import Depends
from app.middleware.tenancy import require_roles

RequireAutomationAdmin = Depends(require_roles(["society_admin", "super_admin"]))
