from fastapi import Depends
from app.dependencies import get_current_user

# Any authenticated user can read their own notifications
RequireAuth = Depends(get_current_user)
