FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (git for GitPython, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for ultra-fast dependency resolution and runtime execution
RUN pip install --no-cache-dir uv

# Copy dependency configuration and install runtime packages ONLY
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen

# Copy application and database migration configurations
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY app/ ./app/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-8000}/api/v1/health/liveness || exit 1

# Start FastAPI server on configured $PORT (defaults to 8000)
CMD ["sh", "-c", "uv run --no-dev uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_CONCURRENCY:-2}"]
