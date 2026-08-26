import asyncio
import logging
import os
import tarfile
import tempfile
import time
import uuid

from celery import shared_task
from sqlalchemy import delete, select, update

from app.core.config import settings
from app.db.session import get_worker_session
from app.modules.indexing.models.index_models import (
    CodeChunk,
    CodeDependency,
    CodeEmbedding,
    CodeSymbol,
    RepositoryFile,
)
from app.modules.indexing.services.chunker import chunk_file
from app.modules.indexing.services.embedder import async_embed_chunks_batched
from app.modules.indexing.services.parsers import parse_file_symbols_and_imports
from app.modules.repository.models.repo import Repository, RepositorySnapshot

logger = logging.getLogger(__name__)

# File extensions we index
INDEXABLE_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".cpp",
    ".cc",
    ".c",
    ".h",
    ".hpp",
    ".cs",
    ".html",
    ".css",
    ".sql",
    ".json",
    ".yaml",
    ".yml",
    ".md",
}

# Specific lockfiles and minified patterns to ignore
IGNORED_FILE_PATTERNS = {
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "uv.lock",
    "poetry.lock",
    "cargo.lock",
    "go.sum",
    "composer.lock",
}

# Directories to skip during indexing walk
IGNORED_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "__pycache__",
    "venv",
    ".venv",
    ".next",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    ".turbo",
    ".coverage",
    ".cache",
    "vendor",
}

BULK_BATCH_SIZE = 500


@shared_task(name="app.workers.repo_index.index_repository")
def index_repository(repository_id: str, snapshot_id: str):
    """Celery background worker entrypoint"""
    asyncio.run(_async_index_repository(repository_id, snapshot_id))


async def _async_index_repository(repository_id: str, snapshot_id: str):
    start_time = time.perf_counter()
    async with get_worker_session() as session:
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

        snapshot_dir = settings.snapshot_dir
        tar_path = os.path.join(snapshot_dir, snapshot.storage_key)
        if not os.path.exists(tar_path):
            tar_path = os.path.join("backend", snapshot_dir, snapshot.storage_key)
            if not os.path.exists(tar_path):
                logger.error(
                    f"Snapshot tarball not found at '{settings.snapshot_dir}/{snapshot.storage_key}' — aborting."
                )
                return

        # Update status to syncing
        await session.execute(
            update(Repository)
            .where(Repository.id == repo_uuid)
            .values(sync_status="syncing")
        )
        await session.commit()

        # Clean prior index records for this repository if re-indexing
        await session.execute(
            delete(CodeDependency).where(CodeDependency.repository_id == repo_uuid)
        )
        await session.execute(
            delete(CodeChunk).where(CodeChunk.repository_id == repo_uuid)
        )
        await session.execute(
            delete(RepositoryFile).where(RepositoryFile.repository_id == repo_uuid)
        )
        await session.commit()

        # 2. Extract tarball in memory/tempdir
        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                with tarfile.open(tar_path, "r:gz") as tar:
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

            # 3. Discover & Parse all code files in memory
            discovered_files: list[tuple[str, str, str]] = []  # (rel_path, ext, source)
            for root, dirs, files in os.walk(tmpdir):
                dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
                for file in files:
                    file_lower = file.lower()
                    if file_lower in IGNORED_FILE_PATTERNS or file_lower.endswith((".min.js", ".min.css", ".bundle.js", ".map")):
                        continue

                    ext = os.path.splitext(file)[1].lower()
                    if ext not in INDEXABLE_EXTENSIONS:
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, tmpdir)
                    try:
                        with open(
                            full_path, "r", encoding="utf-8", errors="replace"
                        ) as f:
                            source = f.read()
                        discovered_files.append((rel_path, ext, source))
                    except (OSError, PermissionError) as exc:
                        logger.warning(f"Could not read file {rel_path}: {exc}")
                        continue

            logger.info(
                f"Discovered {len(discovered_files)} indexable files in repo {repository_id}"
            )

            # 4. Ingest RepositoryFiles in bulk
            file_records: list[RepositoryFile] = []
            for rel_path, ext, _ in discovered_files:
                file_records.append(
                    RepositoryFile(
                        repository_id=repo_uuid,
                        snapshot_id=snap_uuid,
                        file_path=rel_path,
                        language=ext.strip("."),
                    )
                )

            session.add_all(file_records)
            await session.flush()

            # Map rel_path -> RepositoryFile.id
            file_id_map = {rf.file_path: rf.id for rf in file_records}

            # 5. Extract symbols, dependencies, and chunks
            symbol_records: list[CodeSymbol] = []
            dependency_records: list[CodeDependency] = []
            all_chunks_metadata: list[
                tuple[uuid.UUID, dict]
            ] = []  # (file_id, chunk_dict)
            all_chunk_texts: list[str] = []

            for rel_path, ext, source in discovered_files:
                file_id = file_id_map.get(rel_path)
                if not file_id:
                    continue

                symbols, raw_imports = parse_file_symbols_and_imports(rel_path, source)

                # Add symbols
                for sym in symbols:
                    symbol_records.append(
                        CodeSymbol(
                            file_id=file_id,
                            symbol_name=sym["name"],
                            symbol_type=sym["type"],
                            line_start=sym["line_start"],
                            line_end=sym["line_end"],
                        )
                    )

                # Add dependencies
                for imp in raw_imports:
                    dependency_records.append(
                        CodeDependency(
                            repository_id=repo_uuid,
                            source_file=rel_path,
                            target_file=imp,
                        )
                    )

                # AST-Aware Chunking with hierarchical context breadcrumbs
                chunks = chunk_file(source, symbols, file_path=rel_path)
                for c in chunks:
                    all_chunks_metadata.append((file_id, c))
                    all_chunk_texts.append(c["text"])

            # 6. Bulk Insert Symbols and Dependencies
            if symbol_records:
                for i in range(0, len(symbol_records), BULK_BATCH_SIZE):
                    session.add_all(symbol_records[i : i + BULK_BATCH_SIZE])
                await session.flush()

            if dependency_records:
                for i in range(0, len(dependency_records), BULK_BATCH_SIZE):
                    session.add_all(dependency_records[i : i + BULK_BATCH_SIZE])
                await session.flush()

            logger.info(
                f"Parsed {len(symbol_records)} symbols and {len(dependency_records)} dependencies"
            )

            # 7. Batched Vector Tensor Embedding
            if all_chunk_texts:
                logger.info(
                    f"Generating vector embeddings for {len(all_chunk_texts)} chunks..."
                )
                embeddings = await async_embed_chunks_batched(
                    all_chunk_texts, batch_size=64
                )

                # 8. Bulk Insert Chunks and Embeddings
                chunk_records: list[CodeChunk] = []
                for file_id, chunk_data in all_chunks_metadata:
                    chunk_records.append(
                        CodeChunk(
                            file_id=file_id,
                            repository_id=repo_uuid,
                            chunk_text=chunk_data["text"],
                            token_count=chunk_data["token_count"],
                            line_start=chunk_data["line_start"],
                            line_end=chunk_data["line_end"],
                        )
                    )

                session.add_all(chunk_records)
                await session.flush()

                # Pair embeddings with chunk IDs
                embedding_records: list[CodeEmbedding] = []
                for i, chunk_rec in enumerate(chunk_records):
                    embedding_records.append(
                        CodeEmbedding(
                            chunk_id=chunk_rec.id,
                            embedding=embeddings[i],
                        )
                    )

                for i in range(0, len(embedding_records), BULK_BATCH_SIZE):
                    session.add_all(embedding_records[i : i + BULK_BATCH_SIZE])
                await session.flush()

        # 9. Mark completed & commit
        await session.execute(
            update(Repository)
            .where(Repository.id == repo_uuid)
            .values(sync_status="completed")
        )
        await session.commit()

        elapsed = time.perf_counter() - start_time
        logger.info(
            f"⚡ Repository {repository_id} indexed in {elapsed:.2f}s "
            f"({len(discovered_files)} files, {len(symbol_records)} symbols, "
            f"{len(all_chunk_texts)} chunks, {len(dependency_records)} dependencies)."
        )
