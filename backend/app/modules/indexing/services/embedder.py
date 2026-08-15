import os
import warnings

from sentence_transformers import SentenceTransformer

# Suppress huggingface warnings in the worker log
os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore")

# Load model globally so it stays in RAM between celery tasks.
# This runs locally and is 100% free!
model = SentenceTransformer("all-MiniLM-L6-v2")


def embed_chunks(texts: list[str]) -> list[list[float]]:
    """Returns a list of 384-dimensional vector embeddings."""
    if not texts:
        return []

    # encode() converts our code strings into mathematically dense meaning-vectors
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    # Convert numpy arrays back to standard Python float lists for Postgres
    return [emb.tolist() for emb in embeddings]
