from fastapi import Depends
from app.middleware.tenancy import require_society_membership

RequireResident = Depends(require_society_membership)
