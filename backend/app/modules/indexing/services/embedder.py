import asyncio
import os
import warnings

from sentence_transformers import SentenceTransformer

# Suppress huggingface warnings in the worker log
os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore")

# Load model globally so it stays in RAM between celery tasks.
# all-MiniLM-L6-v2 produces 384-dimensional vector embeddings locally
model = SentenceTransformer("all-MiniLM-L6-v2")


def embed_chunks(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Returns a list of 384-dimensional vector embeddings in optimized batches."""
    if not texts:
        return []

    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        convert_to_numpy=True,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return [emb.tolist() for emb in embeddings]


async def async_embed_chunks_batched(
    texts: list[str], batch_size: int = 64
) -> list[list[float]]:
    """Non-blocking async wrapper that runs heavy PyTorch vector encoding in a worker thread."""
    if not texts:
        return []
    return await asyncio.to_thread(embed_chunks, texts, batch_size)
