from botocore.exceptions import ClientError

from app.core.config import settings
from app.infrastructure.storage.minio_client import minio_client


def check_storage_connection() -> bool:
    try:
        minio_client.head_bucket(
            Bucket=settings.MINIO_BUCKET
        )

        return True

    except ClientError:
        return False