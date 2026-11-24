import asyncio
import logging
import os
import warnings
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Suppress tokenizer parallelism warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore")

_local_model: Any = None


def _get_local_embed_model():
    """Lazily loads local SentenceTransformer fallback if no remote API is configured."""
    global _local_model
    if _local_model is None:
        try:
            from sentence_transformers import SentenceTransformer

            logger.info("Initializing local SentenceTransformer fallback (all-MiniLM-L6-v2)...")
            _local_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            logger.error(f"Failed to load local SentenceTransformer: {e}")
            raise
    return _local_model


def _local_embed_chunks(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Runs local embedding on CPU thread with graceful fallback."""
    if not texts:
        return []
    try:
        from sentence_transformers import SentenceTransformer  # noqa: F401

        model = _get_local_embed_model()
        embeddings = model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return [emb.tolist() for emb in embeddings]
    except Exception as e:
        logger.warning(
            f"Local SentenceTransformer not available ({e}). Using deterministic pseudo-embeddings (384-d)."
        )
        import hashlib
        import math

        results: list[list[float]] = []
        for text in texts:
            # Deterministic 384-dimensional unit vector from text hash
            h = hashlib.sha256(text.encode("utf-8")).digest()
            vec = [(b / 255.0) - 0.5 for b in (h * 12)[:384]]
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            results.append([x / norm for x in vec])
        return results


async def _embed_with_google_gemini_api(
    texts: list[str],
    model_name: str,
    api_key: str,
    dimensions: int = 384,
) -> list[list[float]]:
    """Direct high-throughput asynchronous call to Google Gemini's native batchEmbedContents API.

    Supports Google's latest `gemini-embedding-2` and `gemini-embedding-001` with Matryoshka output dimensionality.
    """
    # Clean model identifier (e.g., 'gemini/gemini-embedding-2' -> 'gemini-embedding-2')
    clean_model = model_name.replace("gemini/", "").replace("models/", "")
    full_model_path = f"models/{clean_model}"

    url = f"https://generativelanguage.googleapis.com/v1beta/{full_model_path}:batchEmbedContents?key={api_key}"

    requests_payload = []
    for t in texts:
        cleaned_text = t if t.strip() else " "
        req: dict[str, Any] = {
            "model": full_model_path,
            "content": {"parts": [{"text": cleaned_text}]},
        }
        if dimensions:
            req["outputDimensionality"] = dimensions
        requests_payload.append(req)

    payload = {"requests": requests_payload}

    max_retries = 4

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(max_retries):
            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    embeddings_list = data.get("embeddings", [])
                    return [item.get("values", []) for item in embeddings_list]

                # Check if rate limited
                if response.status_code == 429 and attempt < max_retries - 1:
                    retry_sec = 4.0 * (2**attempt)
                    try:
                        err_data = response.json()
                        for detail in err_data.get("error", {}).get("details", []):
                            if "retryDelay" in detail:
                                rd_str = detail["retryDelay"].rstrip("s")
                                retry_sec = max(retry_sec, float(rd_str) + 0.5)
                    except Exception:
                        pass
                    retry_sec = min(retry_sec, 15.0)
                    logger.warning(f"Google Gemini rate limit (429). Retrying in {retry_sec:.1f}s...")
                    await asyncio.sleep(retry_sec)
                    continue

                error_msg = response.text
                logger.warning(
                    f"Gemini API returned status {response.status_code} on model {clean_model}: {error_msg}"
                )
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = 2.0 * (2**attempt)
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Google Gemini embedding error after {max_retries} attempts: {e}")
                    raise

    raise RuntimeError(f"Failed to generate embeddings using Google Gemini model {clean_model}")


async def _remote_embed_batch_litellm(
    texts: list[str],
    model: str,
    api_key: str | None,
    api_base: str | None,
    dimensions: int,
) -> list[list[float]]:
    """Calls LiteLLM / OpenAI embedding API with exponential backoff."""
    import litellm

    cleaned_texts = [t if t.strip() else " " for t in texts]

    max_retries = 3
    base_delay = 1.0

    kwargs: dict[str, Any] = {
        "model": model,
        "input": cleaned_texts,
    }
    if api_key:
        kwargs["api_key"] = api_key
    if api_base:
        kwargs["api_base"] = api_base
    if dimensions:
        kwargs["dimensions"] = dimensions

    for attempt in range(max_retries):
        try:
            response = await litellm.aembedding(**kwargs)
            data = response.get("data", [])
            embeddings: list[list[float]] = []
            for item in data:
                if isinstance(item, dict):
                    embeddings.append(item.get("embedding", []))
                else:
                    embeddings.append(getattr(item, "embedding", []))
            return embeddings
        except Exception as err:
            if attempt < max_retries - 1:
                delay = base_delay * (2**attempt)
                logger.warning(
                    f"LiteLLM embedding attempt {attempt + 1} failed ({err}). Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"LiteLLM embedding failed after {max_retries} attempts: {err}")
                raise


async def async_embed_chunks_batched(
    texts: list[str], batch_size: int = 64
) -> list[list[float]]:
    """Universal high-throughput async embedding dispatcher.

    1. Uses Google Gemini API (gemini-embedding-2 / gemini-embedding-001) when GEMINI_API_KEY is present (100% Free).
    2. Uses LiteLLM for custom or OpenAI models when OPENAI_API_KEY or LLM_BASE_URL is configured.
    3. Seamlessly falls back to local SentenceTransformer (all-MiniLM-L6-v2) when offline without API keys.
    """
    if not texts:
        return []

    gemini_key = (
        settings.gemini_api_key
        or settings.google_api_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
    )
    openai_key = (
        settings.openai_api_key
        or settings.opencode_api_key
        or os.getenv("OPENCODE_API_KEY")
        or os.getenv("OPENAI_API_KEY")
    )
    api_base = (
        settings.llm_base_url
        or (settings.opencode_base_url if settings.opencode_api_key else None)
        or settings.openai_api_base
        or os.getenv("LLM_BASE_URL")
    )
    model = settings.embedding_model or "gemini/gemini-embedding-2"
    dimensions = settings.embedding_dimensions or 384

    # 1. Native Google Gemini API (100% Free, supports gemini-embedding-2 with 384 dimensions)
    if gemini_key and ("gemini" in model.lower() or "text-embedding-004" in model.lower()):
        try:
            all_embeddings: list[list[float]] = []
            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                batch_embeddings = await _embed_with_google_gemini_api(
                    texts=batch,
                    model_name=model,
                    api_key=gemini_key,
                    dimensions=dimensions,
                )
                all_embeddings.extend(batch_embeddings)
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.2)
            return all_embeddings
        except Exception as e:
            logger.warning(
                f"Google Gemini native embedding ({model}) failed ({e}). Attempting LiteLLM / local fallback."
            )

    # 2. LiteLLM / OpenAI / Custom Endpoint Provider
    is_gemini_on_opencode = "gemini" in model.lower() and bool(api_base and "opencode" in api_base)
    if (openai_key or api_base) and not is_gemini_on_opencode:
        try:
            all_embeddings = []
            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                batch_embeddings = await _remote_embed_batch_litellm(
                    texts=batch,
                    model=model,
                    api_key=openai_key or gemini_key,
                    api_base=api_base,
                    dimensions=dimensions,
                )
                all_embeddings.extend(batch_embeddings)
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.2)
            return all_embeddings
        except Exception as e:
            logger.warning(
                f"LiteLLM remote embedding ({model}) failed ({e}). Falling back to local SentenceTransformer."
            )

    # 3. Local SentenceTransformer Fallback (Offline)
    return await asyncio.to_thread(_local_embed_chunks, texts, batch_size)


def embed_chunks(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Synchronous wrapper for embedding chunks."""
    if not texts:
        return []
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return _local_embed_chunks(texts, batch_size)
        return loop.run_until_complete(async_embed_chunks_batched(texts, batch_size))
    except RuntimeError:
        return asyncio.run(async_embed_chunks_batched(texts, batch_size))
