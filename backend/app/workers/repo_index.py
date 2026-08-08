import asyncio
import os
import tarfile
import tempfile
import uuid

from celery import shared_task
from sqlalchemy import select, update

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


@shared_task(name="app.workers.repo_index.index_repository")
def index_repository(repository_id: str, snapshot_id: str):
    """Celery background worker entrypoint"""
    asyncio.run(_async_index_repository(repository_id, snapshot_id))

async def _async_index_repository(repository_id: str, snapshot_id: str):
    async with AsyncSessionLocal() as session:
        repo_uuid = uuid.UUID(repository_id)
        snap_uuid = uuid.UUID(snapshot_id)
        
        # 1. Fetch snapshot tarball info
        result = await session.execute(select(RepositorySnapshot).where(RepositorySnapshot.id == snap_uuid))
        snapshot = result.scalar_one_or_none()
        if not snapshot:
            return
            
        # The local path to the zip file created in Phase 03
        tar_path = f"backend/data/snapshots/{snapshot.storage_key}"
        if not os.path.exists(tar_path):
            # Try path relative to worker cwd
            tar_path = f"data/snapshots/{snapshot.storage_key}"
            if not os.path.exists(tar_path):
                return
            
        # Update status to indexing (using syncing enum)
        await session.execute(update(Repository).where(Repository.id == repo_uuid).values(sync_status="syncing"))
        await session.commit()

        # 2. Extract tarball into a temporary folder that deletes itself after
        with tempfile.TemporaryDirectory() as tmpdir:
            with tarfile.open(tar_path, "r:gz") as tar:
                tar.extractall(path=tmpdir)
                
            # 3. Walk directory and parse every code file
            for root, _, files in os.walk(tmpdir):
                if any(ignored in root for ignored in ["node_modules", ".git", "dist", "build", "__pycache__", "venv", ".next"]):
                    continue
                    
                for file in files:
                    ext = os.path.splitext(file)[1]
                    if ext not in [".py", ".js", ".jsx", ".ts", ".tsx"]:
                        continue
                        
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, tmpdir)
                    
                    try:
                        with open(full_path, "r", encoding="utf-8") as f:
                            source = f.read()
                    except:
                        continue # Skip unreadable binaries
                        
                    # Save File to DB
                    repo_file = RepositoryFile(
                        repository_id=repo_uuid,
                        snapshot_id=snap_uuid,
                        file_path=rel_path,
                        language=ext.strip('.')
                    )
                    session.add(repo_file)
                    await session.flush()
                    
                    # 4. AST Parser -> Extract Symbols
                    symbols = parse_file(rel_path, source)
                    for sym in symbols:
                        session.add(CodeSymbol(
                            file_id=repo_file.id,
                            symbol_name=sym["name"],
                            symbol_type=sym["type"],
                            line_start=sym["line_start"],
                            line_end=sym["line_end"]
                        ))
                    
                    # 5. Chunker -> Split file into blocks
                    chunks = chunk_file(source, symbols)
                    if not chunks:
                        continue
                        
                    # 6. AI Embeddings -> Vectorize the blocks locally
                    chunk_texts = [c["text"] for c in chunks]
                    embeddings = embed_chunks(chunk_texts)
                    
                    # 7. Save Chunks + pgvector Embeddings to DB
                    for i, chunk_data in enumerate(chunks):
                        chunk_record = CodeChunk(
                            file_id=repo_file.id,
                            repository_id=repo_uuid,
                            chunk_text=chunk_data["text"],
                            token_count=chunk_data["token_count"],
                            line_start=chunk_data["line_start"],
                            line_end=chunk_data["line_end"]
                        )
                        session.add(chunk_record)
                        await session.flush()
                        
                        session.add(CodeEmbedding(
                            chunk_id=chunk_record.id,
                            embedding=embeddings[i]
                        ))
                        
        # 8. Mark repository as fully indexed!
        await session.execute(update(Repository).where(Repository.id == repo_uuid).values(sync_status="completed"))
        await session.commit()
