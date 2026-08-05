# TraceIQ — Backend

The backend for TraceIQ is a high-performance Python API built with FastAPI, PostgreSQL (with pgvector for semantic search), and Redis for Celery background tasks. Dependency management is handled by `uv`.

## Prerequisites

- [uv](https://github.com/astral-sh/uv) (Python package manager)
- PostgreSQL (with `pgvector` extension)
- Redis (for Celery workers)

## Setup

1. Sync dependencies using `uv`:
   ```bash
   uv sync
   ```
2. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in the required database, Redis, and OpenAI API keys in `.env`.

## Database Migrations

Apply Alembic migrations to setup the database schema:

```bash
uv run alembic upgrade head
```

## Running the API

Start the FastAPI development server:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

## Background Workers

TraceIQ relies on Celery for heavy tasks (repo cloning, indexing, AI analysis). Start the Celery worker in a separate terminal:

```bash
uv run celery -A app.workers.celery_app worker --loglevel=info
```
