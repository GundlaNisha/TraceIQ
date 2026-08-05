# TraceIQ

TraceIQ is an AI-powered requirement-to-code impact analysis tool. It ingests your Git repositories, indexes the code using Tree-sitter and pgvector embeddings, and uses AI to map product requirements directly to the impacted source code.

TraceIQ automates the heavy lifting of figuring out "where do I make this change?" by visualizing impacted files in a dependency graph, and can even generate initial Pull Request drafts.

## Monorepo Structure

This repository is organized as a monorepo:

- `/frontend` — Next.js 16 (App Router), Tailwind CSS v4, Zustand, and TanStack Query.
- `/backend` — FastAPI, Celery, PostgreSQL (with pgvector), and Redis. Managed via `uv`.
- `/plan-docs` — Internal implementation specifications, API contracts, and team task assignments.

## Quick Start

Please see the respective README files in the `/frontend` and `/backend` directories for specific setup and execution instructions.
