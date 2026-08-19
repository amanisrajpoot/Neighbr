from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uuid

class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict | None = None,
        field_errors: list[dict] | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.field_errors = field_errors or []
        super().__init__(message)

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "field_errors": exc.field_errors,
            },
            "request_id": request_id,
        },
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    field_errors = []
    for err in exc.errors():
        locs = list(err.get("loc", []))
        if locs and locs[0] in ("body", "query", "path", "header", "cookie"):
            locs = locs[1:]
        field_name = ".".join(str(l) for l in locs) if locs else "body"
        field_errors.append({"field": field_name, "message": err["msg"]})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload",
                "field_errors": field_errors,
            },
            "request_id": request_id,
        },
    )
