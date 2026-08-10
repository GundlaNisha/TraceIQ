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

## Clerk authentication

TraceIQ uses [Clerk](https://clerk.com) for auth. Two paths keep the local `users` table in sync with Clerk:

1. **Webhook** (primary) — Clerk posts `user.created` / `user.updated` / `user.deleted` to `POST /api/v1/webhooks/clerk`. The endpoint verifies the Svix signature and upserts the row. To enable this, configure a Clerk webhook in the Clerk dashboard pointing at `<your-public-url>/api/v1/webhooks/clerk`, copy the signing secret into `CLERK_WEBHOOK_SECRET` in `backend/.env`.
2. **JWT lazy-upsert** (safety net) — the very first authenticated request from a new user upserts a placeholder row from the JWT claims. The webhook then upgrades it with the real values.

For the lazy-upsert to carry the real email/name (rather than placeholders), the Clerk **session token template** must expose those claims. Configure it once in the Clerk dashboard:

- **Clerk dashboard → Sessions → edit your active session template** → add the following as JSON in the **Claims** editor:
  ```json
  {
    "email": "{{user.primary_email_address}}",
    "email_verified": "{{user.email_verified}}",
    "first_name": "{{user.first_name}}",
    "last_name": "{{user.last_name}}",
    "username": "{{user.username}}",
    "image_url": "{{user.image_url}}"
  }
  ```
- Even without these claims, the app still works: the row gets a placeholder (`<user_id>@clerk.placeholder`) on first sight and is upgraded the next time the webhook fires. Configuring the template just removes that brief window of placeholder data.
