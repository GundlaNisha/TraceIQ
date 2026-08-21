# TraceIQ

Autonomous Code Impact Analysis, AST Code Graph Indexing, and Pull Request Review Intelligence.

---

## Overview

TraceIQ is an enterprise-grade developer platform that bridges product requirements, codebase architecture, and pull request reviews. By combining Abstract Syntax Tree (AST) code graph traversal, Reciprocal Rank Fusion (RRF) hybrid retrieval, and large language models, TraceIQ automatically determines the blast radius of proposed requirements, conducts automated pull request code reviews, and enforces an end-to-end Traceability Matrix across the engineering lifecycle.

---

## Core Capabilities

### 1. High-Throughput Code Indexing & Dependency Graph
- **Multi-Language AST Parsing**: Extracts symbols (classes, methods, functions) and import statements across Python, TypeScript, JavaScript, Go, Rust, Java, and C/C++ using Tree-sitter.
- **Dependency Graph Mapping**: Persists directed code dependencies to map out structural relations, upstream modules, and downstream callers.
- **Batched Vector Tensor Embedding**: Computes dense 384-dimensional code embeddings using `all-MiniLM-L6-v2` in off-thread worker batches, persisted with `pgvector`.
- **Bulk Database Ingestion**: Executes bulk SQL transactions to index large repositories in seconds.

### 2. Sub-15ms Hybrid Code Search (RRF)
- **Multi-Signal Retrieval**: Fuses three independent search signals into a unified ranking:
  - Dense Vector Semantic Distance (`pgvector` cosine similarity)
  - Full-Text Substring Matching (`tsvector` / text pattern search)
  - AST Symbol Table Lookup (`code_symbols`)
- **Reciprocal Rank Fusion (RRF)**: Merges disparate relevance scores into an accurate, deduplicated candidate list with sub-15ms query latency.

### 3. Graph-Augmented Impact Blast Radius Analysis
- **2-Hop Graph Traversal**: Automatically expands from direct semantic candidate seeds to 1-hop and 2-hop connected dependencies in the code graph.
- **Structural Context Synthesis**: Formats AST dependency graphs and relevant source blocks into contextual prompts for precise blast radius prediction.
- **Deterministic Risk Scoring**: Flags impacted files, confidence scores, and architectural risk levels (High, Medium, Low).

### 4. Automated Pull Request Review Engine
- **Per-File Patch Chunking**: Parses unified diffs into structured per-file modifications to prevent truncation on large pull requests.
- **Multi-Threaded Parallel Review**: Concurrently analyzes changed files using asynchronous worker task batches for fast turnaround.
- **Requirement Gap Detection**: Cross-references pull request diffs against stated product requirements and expected blast radius, flagging unaddressed criteria, missing tests, and edge case regressions.
- **Direct GitHub Integration**: Automatically posts structured code review comments, severity summaries, and line-level recommendations to GitHub pull requests via GitHub App tokens.

### 5. Traceability Matrix & Audit Inspection
- **End-to-End Compliance**: Aggregates product requirements, predicted impact blast radius, and pull request review verdicts into a unified audit view.
- **Health Scoring**: Computes repository-level compliance scores based on requirement test coverage and critical finding resolutions.

### 6. Repository Lifecycle Controls
- **1-Click GitHub App Import**: Discovers accessible repositories and imports them in a single step.
- **Full Lifecycle Management**: On-demand repository resyncing, real-time background status polling, sync cancellation, and failed job retry mechanisms.

---

## System Architecture

```mermaid
graph TD
    subgraph Client Layer
        A[Next.js 16 Web Interface] --> B[Clerk Authentication]
        A --> C[TanStack Query & Zustand State]
    end

    subgraph API & Gateway Layer
        D[FastAPI REST API] --> B
        D --> E[PostgreSQL + pgvector]
        D --> F[Redis Message Broker]
    end

    subgraph Async Worker Layer
        F --> G[Celery Task Workers]
        G --> H[Tree-sitter AST Parser & Dependency Graph]
        G --> I[SentenceTransformer Vector Embedder]
        G --> J[LiteLLM AI Dispatcher]
        G --> E
    end

    subgraph External Integrations
        J --> K[LLM Providers / DeepSeek / OpenAI]
        G --> L[GitHub App API & Webhooks]
        D --> L
    end

    A --> D
```

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | Server and client rendering, routing, and metadata |
| **Styling** | Vanilla CSS / Tailwind CSS v4, Base UI | Design system, responsive layouts, and modal components |
| **State & Data** | TanStack Query v5, Zustand | Asynchronous server-state caching and active repository context |
| **Backend** | FastAPI, Python 3.11, Pydantic v2 | High-throughput asynchronous REST API |
| **Database** | PostgreSQL with `pgvector` (Neon Serverless) | Relational persistence, full-text search, and vector distance indexing |
| **Task Queue** | Celery, Redis | Background repository synchronization, indexing, and AI reviews |
| **Code Intelligence** | Tree-sitter, SentenceTransformers (`all-MiniLM-L6-v2`) | AST symbol extraction, dependency graph generation, and vector embeddings |
| **AI Layer** | LiteLLM, Instructor | Structured schema validation and LLM orchestration |
| **Authentication** | Clerk | Multi-tenant user authentication and session verification |

---

## Repository Structure

```
TraceIQ/
├── backend/
│   ├── app/
│   │   ├── ai/                      # AI prompts, context builders, and LiteLLM adapters
│   │   ├── core/                    # Application settings, exceptions, and dependencies
│   │   ├── db/                      # SQLAlchemy async sessions and Alembic migrations
│   │   ├── modules/
│   │   │   ├── auth/                # User sync and Clerk webhooks
│   │   │   ├── github/              # GitHub App installation, PR syncing, and webhooks
│   │   │   ├── impact/              # Impact analysis job management and schemas
│   │   │   ├── indexing/            # Tree-sitter AST parsers, chunkers, and embedders
│   │   │   ├── repository/          # Repository CRUD, settings, and sync endpoints
│   │   │   ├── requirement/         # Requirements and version management
│   │   │   ├── retrieval/           # Hybrid search (pgvector + Text + Symbols RRF)
│   │   │   ├── review/              # PR review models and schemas
│   │   │   └── traceability/        # Traceability Matrix aggregation routes
│   │   └── workers/                 # Celery background tasks (indexing, sync, PR review)
│   ├── pyproject.toml               # Python dependencies managed via uv
│   └── tests/                       # Pytest unit and integration test suite
├── frontend/
│   ├── app/                         # Next.js App Router pages and metadata
│   ├── components/                  # Shared UI components, providers, and navigation
│   ├── features/                    # Domain-driven feature modules (dashboard, repos, etc.)
│   ├── lib/                         # API client, utility functions, and TypeScript types
│   ├── stores/                      # Zustand state stores (workspace selection)
│   └── package.json                 # Frontend dependencies and scripts
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18.17+) and npm
- Python 3.11+ and `uv` package manager
- PostgreSQL database with `pgvector` extension enabled
- Redis server (local or hosted)

---

### Backend Setup

1. **Navigate to the backend directory and install dependencies**:
   ```bash
   cd backend
   uv sync
   source .venv/bin/activate
   ```

2. **Configure environment variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname
   REDIS_URL=redis://localhost:6379/0
   CLERK_SECRET_KEY=sk_test_...
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_JWKS_URL=https://.../.well-known/jwks.json
   OPENAI_API_KEY=sk-...
   GITHUB_APP_ID=...
   GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   GITHUB_WEBHOOK_SECRET=...
   FRONTEND_URL=http://localhost:3000
   ALLOWED_ORIGINS=["http://localhost:3000"]
   ```

3. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

4. **Start the API server and Celery background worker**:
   ```bash
   # Terminal 1: FastAPI Development Server
   uv run fastapi dev app/main.py --port 8000

   # Terminal 2: Celery Worker
   uv run celery -A app.workers.celery_app worker --loglevel=info -c 4
   ```

---

### Frontend Setup

1. **Navigate to the frontend directory and install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_GITHUB_APP_NAME=traceiq-official
   ```

3. **Start the Next.js development server**:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

---

## Testing & Quality Assurance

### Backend Tests
The backend test suite covers AST parsers, dependency extractors, hybrid search logic, and AI dispatchers:
```bash
cd backend
uv run pytest tests/ai/ tests/indexing/
```

To run code formatting and linting:
```bash
cd backend
uv run ruff check .
uv run ruff format .
```

### Frontend Tests & Type Checking
```bash
cd frontend
npm run test
npm run build
```

---

## API Reference

The interactive OpenAPI documentation is generated automatically by FastAPI and is accessible at:
`http://localhost:8000/docs`

### Primary Endpoints:
- `GET /api/v1/repositories`: List tracked repositories and automation settings.
- `POST /api/v1/repositories`: Connect a new repository.
- `POST /api/v1/repositories/{id}/resync`: Trigger full re-indexing of a repository.
- `POST /api/v1/repositories/{id}/cancel-sync`: Cancel an ongoing sync job.
- `GET /api/v1/search/code`: Execute sub-15ms hybrid RRF code search.
- `POST /api/v1/requirements/{id}/analyze`: Run graph-augmented impact blast radius analysis.
- `GET /api/v1/github/pull-requests`: List and filter pull requests across tracked repositories.
- `POST /api/v1/reviews/pull-requests/{id}/publish-comment`: Post AI review directly to GitHub.
- `GET /api/v1/traceability`: Fetch repository compliance and acceptance criteria mappings.

---

## License

This project is licensed under the MIT License.