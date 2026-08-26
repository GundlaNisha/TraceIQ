FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (git for GitPython, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv

# Copy dependency configuration and install runtime packages ONLY
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen

# Copy application and migration configurations
COPY alembic.ini ./
COPY app/ ./app/

# Expose port and start FastAPI immediately on Render's $PORT (defaults to 8000)
CMD ["sh", "-c", "uv run --no-dev uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
