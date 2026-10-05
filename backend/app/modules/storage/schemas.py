from pydantic import BaseModel

class FileUploadResponse(BaseModel):
    url: str
    key: str
    storage_type: str
    filename: str
    content_type: str
    size_bytes: int
