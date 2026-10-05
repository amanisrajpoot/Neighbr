import io
import pytest
from httpx import AsyncClient
from app.modules.auth.models import User
from app.database import AsyncSessionLocal
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_storage_upload_and_validation(client: AsyncClient):
    # 1. Create a user and token
    async with AsyncSessionLocal() as db:
        user = User(
            phone="+919876599999",
            full_name="Storage Tester",
            is_active=True,
            phone_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        user_id = str(user.id)

    token = create_access_token(data={"sub": user_id, "phone": "+919876599999"})
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test valid image upload
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRfakeimagebytes")
    files = {"file": ("visitor_face.png", fake_image, "image/png")}
    data = {"folder": "visitors"}

    res = await client.post("/api/v1/storage/upload", files=files, data=data, headers=headers)
    assert res.status_code == 201
    upload_res = res.json()
    assert upload_res["filename"] == "visitor_face.png"
    assert upload_res["content_type"] == "image/png"
    assert "url" in upload_res
    assert upload_res["size_bytes"] > 0

    # 3. Test unsupported file type rejection
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    bad_files = {"file": ("malware.exe", fake_exe, "application/x-dosexec")}
    bad_res = await client.post("/api/v1/storage/upload", files=bad_files, headers=headers)
    assert bad_res.status_code == 400
    assert "Unsupported file type" in bad_res.json()["detail"]
