from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.modules.auth.models import User
from app.core.storage import storage_service
from app.modules.storage.schemas import FileUploadResponse

router = APIRouter(prefix="/storage", tags=["Storage & Media"])

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("general"),
    current_user: User = Depends(get_current_user),
):
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Allowed types: JPEG, PNG, WEBP, GIF, PDF, CSV, XLSX",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 15MB limit.",
        )

    result = await storage_service.upload_file(
        file_bytes=content,
        filename=file.filename or "uploaded_file",
        content_type=content_type,
        folder=folder,
    )

    return FileUploadResponse(**result)
