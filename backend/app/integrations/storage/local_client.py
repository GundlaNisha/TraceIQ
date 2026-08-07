import asyncio
import os
import shutil
from app.core.config import settings

# In production, this would be a cloud path. Locally, we store in backend/data/snapshots
STORAGE_DIR = os.path.join(os.getcwd(), "data", "snapshots")
os.makedirs(STORAGE_DIR, exist_ok=True)

async def upload_tarball(file_path: str, destination_key: str) -> str:
    """Move a local tarball to the local storage directory. Returns the storage key."""
    def _upload():
        # Clean the destination key to prevent path traversal
        safe_key = destination_key.replace("/", os.sep)
        final_path = os.path.join(STORAGE_DIR, safe_key)
        
        # Ensure the subdirectories exist (e.g. data/snapshots/repositories/repo_id/)
        os.makedirs(os.path.dirname(final_path), exist_ok=True)
        
        # Move the file instead of uploading
        shutil.move(file_path, final_path)
        return destination_key

    return await asyncio.to_thread(_upload)
