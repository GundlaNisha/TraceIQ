# TraceIQ

Autonomous Code Impact Analysis, AST Code Graph Indexing, and Pull Request Review Intelligence.

---

## Overview

TraceIQ is an enterprise-grade developer platform that bridges product requirements, codebase architecture, and pull request reviews. By combining Abstract Syntax Tree (AST) code graph traversal, Reciprocal Rank Fusion (RRF) hybrid retrieval, multi-tenant team workspaces, and large language models, TraceIQ automatically determines the blast radius of proposed requirements, conducts automated pull request code reviews, and enforces an end-to-end Traceability Matrix across the engineering lifecycle.

---

## Core Capabilities

### 1. Multi-Tenant Team Workspaces & RBAC
- **Personal vs. Team Workspaces**: Every user receives a private Personal Workspace alongside the ability to create and manage collaborative Team Workspaces.
- **Role-Based Access Control (RBAC)**: Supports `Owner`, `Admin`, `Member`, and `Viewer` roles with fine-grained access control across repositories, requirements, and analyses.
- **Seamless Invite Links**: Generate secure, expiring tokenized invite links for 1-click team onboarding (`/join/[token]`).
- **Flexible Repository Transfers**: Move repositories and their indexed dependency data between Personal and Team Workspaces directly from repository settings or workspace management.
- **Scoped Intelligence**: All PR reviews, requirements, blast radius analyses, and traceability records automatically scope to the active workspace (`X-Workspace-Id`).

### 2. High-Throughput Code Indexing & Dependency Graph
- **Multi-Language AST Parsing**: Deep symbol extraction (classes, methods, functions, types, interfaces) and import analysis across Python, TypeScript, JavaScript, Go, Rust, Java/Kotlin, and C/C++ using Tree-sitter and resilient language grammars.
- **AST-Aware Semantic Code Chunking**: Preserves whole function and class declarations as intact semantic units and injects hierarchical context breadcrumbs (`// Context: path/file.ts > ClassName > methodName`) to anchor vectors in the architectural tree.
- **100% Free Enterprise Embeddings (Google Gemini `gemini-embedding-2`)**: Generates dense 384-dimensional matryoshka vector embeddings using Google's premier embedding model (0 MB server RAM overhead) with automatic offline local fallback.
- **Dependency Graph Mapping**: Persists directed code dependencies to map out structural relations, upstream modules, and downstream callers.
- **Bulk Database Ingestion**: Executes high-throughput bulk SQL transactions to index large codebases in seconds.

### 3. Sub-15ms Hybrid Code Search (RRF)
- **Multi-Signal Retrieval**: Fuses three independent search signals into a unified ranking:
  - Dense Vector Semantic Distance (`pgvector` cosine similarity)
  - Full-Text Substring Matching (`tsvector` / text pattern search)
  - AST Symbol Table Lookup (`code_symbols`)
- **Reciprocal Rank Fusion (RRF)**: Merges disparate relevance scores into an accurate, deduplicated candidate list with sub-15ms query latency.

### 4. Graph-Augmented Impact Blast Radius Analysis
- **2-Hop Graph Traversal**: Automatically expands from direct semantic candidate seeds to 1-hop and 2-hop connected dependencies in the code graph.
- **Structural Context Synthesis**: Formats AST dependency graphs and relevant source blocks into contextual prompts for precise blast radius prediction.
- **Deterministic Risk Scoring**: Flags impacted files, confidence scores, and architectural risk levels (High, Medium, Low).

### 5. Automated Pull Request Review Engine
- **Autonomous Webhook Reviews**: Triggers automated AI code reviews whenever a PR is opened or new commits are pushed via GitHub Webhook.
- **Per-File Patch Chunking & Diff Viewer**: Parses unified diffs into structured per-file modifications and renders them in an interactive side-by-side diff viewer.
- **Requirement Gap Detection**: Cross-references pull request diffs against stated product requirements and expected blast radius, flagging unaddressed criteria, missing tests, and regressions.
- **Direct GitHub Integration**: Automatically posts structured review comments, severity summaries, and line-level recommendations to GitHub PR comment timelines.
- **In-Place Rerun & Deletion**: Re-trigger reviews with custom requirement benchmarks on demand.

### 6. Traceability Matrix & Audit Inspection
- **End-to-End Compliance**: Aggregates product requirements, predicted impact blast radius, and pull request review verdicts into a unified audit view.
- **Health Scoring**: Computes repository-level compliance scores based on requirement test coverage and critical finding resolutions.

### 7. Executive AI Command Center & Dashboard
- **Contextual Greeting & Quick Actions**: Real-time time-of-day greeting, active workspace indicator, and 1-click triggers for Analysis, Requirements, and Repo Import.
- **Live Interactive KPI Deck**: Track Indexed Repositories, AI PR Reviews, Requirements, and Blast Radius runs with visual progress bars.
- **Realtime Activity Timeline Feed**: Live stream of background indexing, PR reviews, and analysis jobs with status badges.

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
        F --> G[Celery Task Workers / In-Memory Dispatcher]
        G --> H[Tree-sitter AST Parser & Dependency Graph]
        G --> I[SentenceTransformer Vector Embedder]
        G --> J[LiteLLM AI Dispatcher]
        G --> E
    end

    subgraph External Integrations
        J --> K[LLM Providers / OpenAI / DeepSeek / Custom Base URLs]
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
| **Styling** | Vanilla CSS / Tailwind CSS v4, Base UI | Custom design system, typography (Fraunces & DM Sans), and responsive layouts |
| **State & Data** | TanStack Query v5, Zustand | Asynchronous server-state caching and active workspace/repo context |
| **Backend** | FastAPI, Python 3.11, Pydantic v2 | High-throughput asynchronous REST API with non-blocking lifespan migrations |
| **Database** | PostgreSQL with `pgvector` (Neon / Supabase) | Relational persistence, full-text search, and vector distance indexing |
| **Task Queue** | Celery / In-Memory Eager Execution, Redis | Background repository synchronization, indexing, and AI reviews |
| **Code Intelligence** | Tree-sitter, SentenceTransformers (`all-MiniLM-L6-v2`) | AST symbol extraction, dependency graph generation, and vector embeddings |
| **AI Layer** | LiteLLM, Instructor | Structured schema validation, custom LLM base URLs, and multi-model dispatching |
| **Authentication** | Clerk | Multi-tenant user authentication, profile sync, and session verification |

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
│   │   │   ├── auth/                # User sync, profile editing, and Clerk webhooks
│   │   │   ├── dashboard/           # Summary statistics and activity feeds
│   │   │   ├── github/              # GitHub App installation, PR syncing, and webhooks
│   │   │   ├── impact/              # Impact analysis job management and schemas
│   │   │   ├── indexing/            # Tree-sitter AST parsers, chunkers, and embedders
│   │   │   ├── repository/          # Repository CRUD, settings, and sync endpoints
│   │   │   ├── requirement/         # Requirements and version management
│   │   │   ├── retrieval/           # Hybrid search (pgvector + Text + Symbols RRF)
│   │   │   ├── review/              # PR review models, reruns, and comments
│   │   │   ├── traceability/        # Traceability Matrix aggregation routes
│   │   │   └── workspace/           # Team workspaces, invites, and RBAC management
│   │   └── workers/                 # Celery background tasks (indexing, sync, PR review)
│   ├── Dockerfile                   # Optimized multi-stage Docker deployment image
│   ├── pyproject.toml               # Python dependencies managed via uv
│   └── tests/                       # Pytest unit and integration test suite
├── frontend/
│   ├── app/                         # Next.js App Router pages and layouts
│   │   └── (protected)/
│   │       ├── analysis/            # Impact blast radius analysis UI
│   │       ├── dashboard/           # Executive intelligence dashboard
│   │       ├── pr-reviews/          # AI PR review feed, reruns, and diff inspection
│   │       ├── pull-requests/       # GitHub pull requests view
│   │       ├── repositories/        # Repository management and automation settings
│   │       ├── requirements/        # Requirement specification management
│   │       ├── traceability/        # Traceability matrix and compliance score
│   │       └── workspaces/          # Team workspace management & invite onboarding
│   ├── features/                    # Domain-driven feature components and API queries
│   ├── lib/                         # API client, utilities, and TypeScript types
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
- Redis server (optional if running in `CELERY_ALWAYS_EAGER=true` mode)

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
   CELERY_ALWAYS_EAGER=true # Set to true to run tasks in-process without separate Celery workers

   # 100% Free AI & Embedding Configuration (Google AI Studio)
   GEMINI_API_KEY=your-free-gemini-api-key # Get free key from https://aistudio.google.com/
   EMBEDDING_MODEL=gemini/gemini-embedding-2
   EMBEDDING_DIMENSIONS=384
   LLM_MODEL=gemini/gemini-1.5-flash

   # Optional OpenAI / Custom LiteLLM routing
   OPENAI_API_KEY=
   LLM_BASE_URL=

   CLERK_SECRET_KEY=sk_test_...
   CLERK_PUBLISHABLE_KEY=pk_test_...
   GITHUB_APP_ID=...
   GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   GITHUB_WEBHOOK_SECRET=...
   FRONTEND_URL=http://localhost:3000
   ALLOWED_ORIGINS=["http://localhost:3000"]
   ```

3. **Run database migrations**:
   ```bash
   uv run alembic upgrade head
   ```

4. **Start the API server and Celery background worker**:
   ```bash
   # Terminal 1: FastAPI Development Server
   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

   # Terminal 2: Celery Worker (if CELERY_ALWAYS_EAGER=false)
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
- `GET /api/v1/dashboard/summary`: Retrieve aggregated workspace metrics and recent activity.
- `GET /api/v1/repositories`: List tracked repositories (supports `?all=true` or scoped by `X-Workspace-Id`).
- `POST /api/v1/repositories`: Connect a new repository and specify target workspace.
- `PATCH /api/v1/repositories/{id}/settings`: Update automation settings and transfer between workspaces.
- `GET /api/v1/workspaces`: List accessible Personal and Team Workspaces.
- `POST /api/v1/workspaces`: Create a new Team Workspace.
- `POST /api/v1/workspaces/{id}/invites`: Generate secure team invite links.
- `POST /api/v1/workspaces/join/{token}`: Accept team workspace invitation.
- `GET /api/v1/search/code`: Execute sub-15ms hybrid RRF code search.
- `POST /api/v1/requirements/{id}/analyze`: Run graph-augmented impact blast radius analysis.
- `GET /api/v1/pr-reviews`: List AI PR reviews scoped by active workspace.
- `POST /api/v1/pr-reviews/{id}/rerun`: Rerun AI code review on demand.
- `GET /api/v1/traceability`: Fetch repository compliance and acceptance criteria mappings.

---

## License

This project is licensed under the MIT License.