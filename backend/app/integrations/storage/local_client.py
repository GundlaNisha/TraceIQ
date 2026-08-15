import asyncio
import os
import shutil

from app.core.config import settings


# In production, this would be a cloud path (e.g. S3/R2). Locally, we store in snapshot_dir
def _get_storage_dir() -> str:
    snap_dir = settings.snapshot_dir
    if not os.path.isabs(snap_dir):
        return os.path.join(os.getcwd(), snap_dir)
    return snap_dir

async def upload_tarball(file_path: str, destination_key: str) -> str:
    """Move a local tarball to the local storage directory. Returns the storage key."""
    def _upload():
        storage_dir = _get_storage_dir()
        os.makedirs(storage_dir, exist_ok=True)
        # Clean the destination key to prevent path traversal
        safe_key = destination_key.replace("/", os.sep)
        final_path = os.path.join(storage_dir, safe_key)
        
        # Ensure the subdirectories exist (e.g. data/snapshots/repositories/repo_id/)
        os.makedirs(os.path.dirname(final_path), exist_ok=True)
        
        # Move the file instead of uploading
        shutil.move(file_path, final_path)
        return destination_key

    return await asyncio.to_thread(_upload)
