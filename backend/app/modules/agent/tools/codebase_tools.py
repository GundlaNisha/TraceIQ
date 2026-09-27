import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.indexing.models.index_models import CodeChunk, CodeSymbol, RepositoryFile
from app.modules.retrieval.services.semantic import hybrid_code_search


async def search_code_symbols_fn(
    db: AsyncSession,
    repository_id: str,
    query: str,
    limit: int = 15,
) -> list[dict[str, Any]]:
    """Search AST symbols (classes, functions, methods) by name in the indexed codebase."""
    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        return []

    stmt = (
        select(CodeSymbol, RepositoryFile)
        .join(RepositoryFile, CodeSymbol.file_id == RepositoryFile.id)
        .where(RepositoryFile.repository_id == repo_uuid)
        .where(CodeSymbol.symbol_name.ilike(f"%{query}%"))
        .limit(limit)
    )
    result = await db.execute(stmt)
    symbols = []
    for sym, file in result.all():
        symbols.append({
            "symbol_name": sym.symbol_name,
            "symbol_type": sym.symbol_type,
            "file_path": file.file_path,
            "start_line": sym.start_line,
            "end_line": sym.end_line,
        })
    return symbols


async def semantic_code_search_fn(
    db: AsyncSession,
    repository_id: str,
    query: str,
    top_k: int = 8,
) -> list[dict[str, Any]]:
    """Perform hybrid vector + keyword semantic search across indexed code chunks."""
    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        return []

    results = await hybrid_code_search(db, query, repo_uuid, top_k=top_k)
    return results


async def read_source_file_snippet_fn(
    db: AsyncSession,
    repository_id: str,
    file_path: str,
    start_line: int | None = None,
    end_line: int | None = None,
) -> dict[str, Any]:
    """Retrieve code content for a specific file and optional line range from indexed chunks."""
    try:
        repo_uuid = uuid.UUID(repository_id)
    except ValueError:
        return {"error": "Invalid repository ID"}

    stmt = (
        select(CodeChunk)
        .join(RepositoryFile, CodeChunk.file_id == RepositoryFile.id)
        .where(
            RepositoryFile.repository_id == repo_uuid,
            RepositoryFile.file_path == file_path,
        )
        .order_by(CodeChunk.start_line.asc())
    )
    result = await db.execute(stmt)
    chunks = result.scalars().all()

    if not chunks:
        return {
            "file_path": file_path,
            "snippet": f"# File {file_path} not found in repository index",
            "lines": [start_line or 1, end_line or 1],
        }

    # Combine chunk texts covering the requested line range
    selected_texts = []
    actual_start = start_line or chunks[0].start_line
    actual_end = end_line or chunks[-1].end_line

    for chunk in chunks:
        if start_line and end_line:
            # Check overlap
            if chunk.end_line >= start_line and chunk.start_line <= end_line:
                selected_texts.append(chunk.chunk_text)
        else:
            selected_texts.append(chunk.chunk_text)

    combined = "\n".join(selected_texts) if selected_texts else chunks[0].chunk_text
    return {
        "file_path": file_path,
        "start_line": actual_start,
        "end_line": actual_end,
        "snippet": combined[:4000],  # safeguard payload size
    }
