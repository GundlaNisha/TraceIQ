FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (git for GitPython, curl, build essentials)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv

# Copy dependency configuration and install packages
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev

# Copy application code and alembic migrations configuration
COPY alembic.ini ./
COPY app/ ./app/

# Automatically run database migrations and start FastAPI on $PORT (defaults to 8000)
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
