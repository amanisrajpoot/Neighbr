from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
import time
import uuid

from app.config import get_settings
from app.core.errors import AppException, app_exception_handler, validation_exception_handler
from app.modules.auth.router import router as auth_router
from app.modules.societies.router import router as societies_router
from app.modules.gates.router import router as gates_router
from app.modules.visitors.router import router as visitors_router
from app.modules.sync.router import router as sync_router
from app.modules.notifications.router import router as notifications_router
from app.modules.staff.router import router as staff_router
from app.modules.vehicles.router import router as vehicles_router
from app.modules.notices.router import router as notices_router
from app.modules.audit.router import router as audit_router
from app.modules.helpdesk.router import router as helpdesk_router
from app.modules.amenities.router import router as amenities_router
from app.modules.billing.router import router as billing_router
from app.modules.community.router import router as community_router
from app.modules.marketplace.router import router as marketplace_router
from app.modules.iot.router import router as iot_router
from app.modules.automations.router import router as automations_router
from app.modules.ai.router import router as ai_router
from app.modules.notifications.ws_router import router as ws_router

settings = get_settings()

from contextlib import asynccontextmanager
from app.modules.notifications.subscribers import register_subscribers

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - Auto-create all domain tables if not present
    from app.database import engine, Base
    import app.modules.auth.models
    import app.modules.societies.models
    import app.modules.gates.models
    import app.modules.visitors.models
    import app.modules.notifications.models
    import app.modules.staff.models
    import app.modules.vehicles.models
    import app.modules.notices.models
    import app.modules.audit.models
    import app.modules.helpdesk.models
    import app.modules.amenities.models
    import app.modules.billing.models
    import app.modules.community.models
    import app.modules.marketplace.models
    import app.modules.iot.models
    import app.modules.automations.models

    register_subscribers()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Timing Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-ID"] = request_id
    return response

# Include All Feature API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(societies_router, prefix=settings.API_V1_STR)
app.include_router(gates_router, prefix=settings.API_V1_STR)
app.include_router(visitors_router, prefix=settings.API_V1_STR)
app.include_router(sync_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(staff_router, prefix=settings.API_V1_STR)
app.include_router(vehicles_router, prefix=settings.API_V1_STR)
app.include_router(notices_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(helpdesk_router, prefix=settings.API_V1_STR)
app.include_router(amenities_router, prefix=settings.API_V1_STR)
app.include_router(billing_router, prefix=settings.API_V1_STR)
app.include_router(community_router, prefix=settings.API_V1_STR)
app.include_router(marketplace_router, prefix=settings.API_V1_STR)
app.include_router(iot_router, prefix=settings.API_V1_STR)
app.include_router(automations_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)

app.include_router(ws_router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }
