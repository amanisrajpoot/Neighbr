import os
import uuid
import logging
from pathlib import Path
import aioboto3
from botocore.exceptions import ClientError
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class StorageService:
    def __init__(self):
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.bucket_name = settings.S3_BUCKET_NAME
        self.session = aioboto3.Session()

    async def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        folder: str = "media",
    ) -> dict[str, str | int]:
        ext = Path(filename).suffix
        key = f"{folder}/{uuid.uuid4().hex}{ext}"

        # 1. Attempt upload to MinIO / S3
        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            ) as s3_client:
                # Ensure bucket exists
                try:
                    await s3_client.head_bucket(Bucket=self.bucket_name)
                except ClientError:
                    try:
                        await s3_client.create_bucket(Bucket=self.bucket_name)
                    except Exception as b_err:
                        logger.warning(f"Could not auto-create S3 bucket: {b_err}")

                await s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=file_bytes,
                    ContentType=content_type,
                )
                url = f"{self.endpoint_url}/{self.bucket_name}/{key}"
                return {
                    "url": url,
                    "key": key,
                    "storage_type": "s3",
                    "filename": filename,
                    "content_type": content_type,
                    "size_bytes": len(file_bytes),
                }
        except Exception as e:
            logger.info(f"S3/MinIO unavailable ({e}); falling back to local filesystem storage.")

        # 2. Resilient local fallback
        local_folder = UPLOAD_DIR / folder
        local_folder.mkdir(parents=True, exist_ok=True)
        local_path = local_folder / f"{uuid.uuid4().hex}{ext}"
        
        with open(local_path, "wb") as f:
            f.write(file_bytes)

        relative_url = f"/uploads/{folder}/{local_path.name}"
        return {
            "url": relative_url,
            "key": str(local_path.as_posix()),
            "storage_type": "local",
            "filename": filename,
            "content_type": content_type,
            "size_bytes": len(file_bytes),
        }

    async def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            ) as s3_client:
                return await s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": key},
                    ExpiresIn=expires_in,
                )
        except Exception as e:
            logger.warning(f"Failed to generate presigned S3 url: {e}")
            return f"/uploads/{key}"

storage_service = StorageService()
