import asyncio
import logging
import os
import tarfile
import tempfile
import uuid

from celery import shared_task
from sqlalchemy import select, update

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.modules.indexing.models.index_models import (
    CodeChunk,
    CodeEmbedding,
    CodeSymbol,
    RepositoryFile,
)
from app.modules.indexing.services.chunker import chunk_file
from app.modules.indexing.services.embedder import embed_chunks
from app.modules.indexing.services.parsers import parse_file
from app.modules.repository.models.repo import Repository, RepositorySnapshot

logger = logging.getLogger(__name__)

# File extensions we know how to index
INDEXABLE_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx"}

# Directories to skip during indexing walk
IGNORED_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "__pycache__",
    "venv",
    ".next",
    ".tox",
    ".mypy_cache",
}


@shared_task(name="app.workers.repo_index.index_repository")
def index_repository(repository_id: str, snapshot_id: str):
    """Celery background worker entrypoint"""
    asyncio.run(_async_index_repository(repository_id, snapshot_id))


async def _async_index_repository(repository_id: str, snapshot_id: str):
    async with AsyncSessionLocal() as session:
        repo_uuid = uuid.UUID(repository_id)
        snap_uuid = uuid.UUID(snapshot_id)

        # 1. Fetch snapshot tarball info
        result = await session.execute(
            select(RepositorySnapshot).where(RepositorySnapshot.id == snap_uuid)
        )
        snapshot = result.scalar_one_or_none()
        if not snapshot:
            logger.error(f"Snapshot {snapshot_id} not found — aborting index.")
            return

        # Resolve tarball path from config
        snapshot_dir = settings.snapshot_dir
        tar_path = os.path.join(snapshot_dir, snapshot.storage_key)
        if not os.path.exists(tar_path):
            # Fallback: try relative to backend/ directory (dev mode)
            tar_path = os.path.join("backend", snapshot_dir, snapshot.storage_key)
            if not os.path.exists(tar_path):
                logger.error(
                    f"Snapshot tarball not found at '{settings.snapshot_dir}/{snapshot.storage_key}' "
                    f"or 'backend/{settings.snapshot_dir}/{snapshot.storage_key}' — aborting."
                )
                return

        # Update status to indexing
        await session.execute(
            update(Repository)
            .where(Repository.id == repo_uuid)
            .values(sync_status="syncing")
        )
        await session.commit()

        # 2. Extract tarball into a temporary folder that deletes itself after
        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                with tarfile.open(tar_path, "r:gz") as tar:
                    # filter="data" prevents path traversal (symlink & absolute path attacks)
                    tar.extractall(path=tmpdir, filter="data")
            except tarfile.TarError as exc:
                logger.error(f"Failed to extract tarball {tar_path}: {exc}")
                await session.execute(
                    update(Repository)
                    .where(Repository.id == repo_uuid)
                    .values(sync_status="failed")
                )
                await session.commit()
                return

            # 3. Walk directory and parse every code file
            files_indexed = 0
            for root, dirs, files in os.walk(tmpdir):
                # Prune ignored dirs in-place so os.walk doesn't descend into them
                dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]

                for file in files:
                    ext = os.path.splitext(file)[1]
                    if ext not in INDEXABLE_EXTENSIONS:
                        continue

                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, tmpdir)

                    try:
                        with open(
                            full_path, "r", encoding="utf-8", errors="replace"
                        ) as f:
                            source = f.read()
                    except (OSError, PermissionError) as exc:
                        logger.warning(f"Could not read file {rel_path}: {exc}")
                        continue

                    # Save File to DB
                    repo_file = RepositoryFile(
                        repository_id=repo_uuid,
                        snapshot_id=snap_uuid,
                        file_path=rel_path,
                        language=ext.strip("."),
                    )
                    session.add(repo_file)
                    await session.flush()

                    # 4. AST Parser -> Extract Symbols
                    try:
                        symbols = parse_file(rel_path, source)
                    except Exception as exc:
                        logger.warning(f"AST parse failed for {rel_path}: {exc}")
                        symbols = []

                    for sym in symbols:
                        session.add(
                            CodeSymbol(
                                file_id=repo_file.id,
                                symbol_name=sym["name"],
                                symbol_type=sym["type"],
                                line_start=sym["line_start"],
                                line_end=sym["line_end"],
                            )
                        )

                    # 5. Chunker -> Split file into blocks
                    chunks = chunk_file(source, symbols)
                    if not chunks:
                        continue

                    # 6. AI Embeddings -> Vectorize the blocks locally
                    chunk_texts = [c["text"] for c in chunks]
                    try:
                        embeddings = embed_chunks(chunk_texts)
                    except Exception as exc:
                        logger.warning(f"Embedding failed for {rel_path}: {exc}")
                        continue

                    # 7. Save Chunks + pgvector Embeddings to DB
                    for i, chunk_data in enumerate(chunks):
                        chunk_record = CodeChunk(
                            file_id=repo_file.id,
                            repository_id=repo_uuid,
                            chunk_text=chunk_data["text"],
                            token_count=chunk_data["token_count"],
                            line_start=chunk_data["line_start"],
                            line_end=chunk_data["line_end"],
                        )
                        session.add(chunk_record)
                        await session.flush()

                        session.add(
                            CodeEmbedding(
                                chunk_id=chunk_record.id, embedding=embeddings[i]
                            )
                        )

                    files_indexed += 1

        # 8. Mark repository as fully indexed!
        await session.execute(
            update(Repository)
            .where(Repository.id == repo_uuid)
            .values(sync_status="completed")
        )
        await session.commit()
        logger.info(
            f"Repository {repository_id} indexed successfully ({files_indexed} files)."
        )
