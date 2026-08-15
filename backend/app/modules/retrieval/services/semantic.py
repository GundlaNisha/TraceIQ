import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.indexing.models.index_models import (
    CodeChunk,
    CodeEmbedding,
    RepositoryFile,
)
from app.modules.indexing.services.embedder import embed_chunks


async def semantic_search(
    db: AsyncSession, query: str, repository_id: uuid.UUID, top_k: int = 10
) -> list[dict]:
    # 1. Convert user's question into a mathematical vector
    query_vector = embed_chunks([query])[0]

    # 2. Perform a pgvector Cosine Distance search!
    stmt = (
        select(
            CodeChunk,
            RepositoryFile,
            CodeEmbedding.embedding.cosine_distance(query_vector).label("distance"),
        )
        .join(CodeEmbedding, CodeEmbedding.chunk_id == CodeChunk.id)
        .join(RepositoryFile, CodeChunk.file_id == RepositoryFile.id)
        .where(CodeChunk.repository_id == repository_id)
        .order_by(CodeEmbedding.embedding.cosine_distance(query_vector))
        .limit(top_k)
    )
    result = await db.execute(stmt)

    items = []
    for chunk, repo_file, distance in result:
        # Strip the random temp directory root (e.g. 'tmpb5t11okc/...')
        path_parts = repo_file.file_path.split("/", 1)
        clean_path = path_parts[1] if len(path_parts) > 1 else repo_file.file_path

        items.append(
            {
                "file_path": clean_path,
                "match_type": "semantic",
                "snippet": chunk.chunk_text,
                "score": 1.0
                - float(distance),  # Convert pgvector distance into a similarity score
            }
        )
    return items
