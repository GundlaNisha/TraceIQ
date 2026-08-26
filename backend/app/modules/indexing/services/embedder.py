import asyncio
import os
import warnings

from sentence_transformers import SentenceTransformer

# Suppress huggingface warnings in the worker log
os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore")

# Load model lazily so import time is instantaneous and memory is only allocated on-demand.
# all-MiniLM-L6-v2 produces 384-dimensional vector embeddings locally
_model: SentenceTransformer | None = None


def get_embed_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_chunks(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Returns a list of 384-dimensional vector embeddings in optimized batches."""
    if not texts:
        return []

    model = get_embed_model()
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
