<p align="center">
  <img src="frontend/public/logo.png" alt="TraceIQ Logo" width="128" />
</p>

# TraceIQ

Autonomous Code Impact Analysis, AST Code Graph Indexing, Jira Bidirectional Sync, and Pull Request Review Intelligence.

---

## Overview

TraceIQ is an enterprise-grade developer platform that bridges product requirements, codebase architecture, Jira issues, and pull request reviews. By combining Abstract Syntax Tree (AST) code graph traversal, Reciprocal Rank Fusion (RRF) hybrid retrieval, bidirectional Jira synchronization, multi-tenant team workspaces, and large language models, TraceIQ automatically determines the blast radius of proposed requirements, conducts automated pull request code reviews, and enforces an end-to-end Traceability Matrix across the engineering lifecycle.

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

### 6. Deep Jira Bidirectional Synchronization & Webhook Drift Detection
- **Issue Browsing & 1-Click Import**: Filter Jira issues by project, issue type, workflow status, board, sprint, or custom JQL, and import single or batch issues directly as linked requirements.
- **Live Inbound Webhooks**: Receives real-time Jira webhook events (`jira:issue_updated`, `jira:issue_deleted`) with support for Jira Cloud native HMAC-SHA256 signature verification (`X-Hub-Signature`), authorization headers, and secret query parameters.
- **Non-Destructive Requirement Drift Detection**: Detects when product managers modify issue descriptions or summaries in Jira, automatically creating an audit log entry (`jira.drift_detected`) without destructively overwriting engineering specs.
- **Status Workflow Transitions**: Fetch valid Jira workflow transitions on-the-fly and transition issue statuses (e.g., *To Do* &rarr; *In Progress* &rarr; *Done*) directly from TraceIQ with optional audit comments.
- **ADF Auto-Comment Posting**: Automatically converts Markdown impact analysis summaries into Atlassian Document Format (ADF) and posts rich comments directly to linked Jira issues.
- **In-App Webhook Verification**: 1-click **"Send Test Ping"** simulator and copyable terminal cURL commands to immediately test delivery and status transitions.

### 7. Interactive Requirement Management & Inspector Drawer
- **Instant Search & Filter**: Real-time filtering across requirement titles, Jira ticket keys (e.g. `SAM1-4`), and repository names.
- **Always-Visible Action Toolbar**: Instant access on every row to **Analyze** (primary CTA), Jira quick tools (Sync, Transition, Comment), Edit, and Delete—with zero hover delay.
- **Requirement Inspector Drawer**: Slide-in inspection panel with tabs for **Specification** (full document view with 1-click Markdown copy and quick actions) and **Version History** (interactive revision timeline with exact timestamps).

### 8. Traceability Matrix & Audit Inspection
- **End-to-End Compliance**: Aggregates product requirements, predicted impact blast radius, and pull request review verdicts into a unified audit view.
- **Health Scoring**: Computes repository-level compliance scores based on requirement test coverage and critical finding resolutions.

### 9. Executive AI Command Center & Dashboard
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
        J --> K[LLM Providers / Google Gemini / OpenAI]
        G --> L[GitHub App API & Webhooks]
        D --> L
        D --> M[Jira REST API v3 & Inbound Webhooks]
        G --> M
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
| **Backend** | FastAPI, Python 3.11/3.12, Pydantic v2 | High-throughput asynchronous REST API with non-blocking lifespan migrations |
| **Database** | PostgreSQL with `pgvector` (Neon / Supabase) | Relational persistence, full-text search, and vector distance indexing |
| **Task Queue** | Celery / In-Memory Eager Execution, Redis | Background repository synchronization, indexing, and AI reviews |
| **Code Intelligence** | Tree-sitter, Google Gemini Embedding 2 / SentenceTransformers | AST symbol extraction, dependency graph generation, and vector embeddings |
| **AI Layer** | LiteLLM, Instructor | Structured schema validation, custom LLM base URLs, and multi-model dispatching |
| **Integrations** | GitHub App API & Jira Cloud REST API v3 | GitHub PR automation and bidirectional Jira issue synchronization with ADF |
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
│   │   ├── integrations/
│   │   │   ├── github/              # GitHub REST API client and webhook parsers
│   │   │   └── jira/                # Jira REST API client and ADF Markdown converter
│   │   ├── modules/
│   │   │   ├── audit/               # Audit log models and drift tracking
│   │   │   ├── auth/                # User sync, profile editing, and Clerk webhooks
│   │   │   ├── dashboard/           # Summary statistics and activity feeds
│   │   │   ├── github/              # GitHub App installation, PR syncing, and webhooks
│   │   │   ├── impact/              # Impact analysis job management and schemas
│   │   │   ├── indexing/            # Tree-sitter AST parsers, chunkers, and embedders
│   │   │   ├── jira/                # Jira integration CRUD, transitions, comments, webhooks
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
│       ├── ai/                      # AI integration tests
│       ├── indexing/                # AST parser & chunker tests
│       └── jira/                    # Jira client, ADF converter, and webhook tests
├── frontend/
│   ├── app/                         # Next.js App Router pages and layouts
│   │   └── (protected)/
│   │       ├── analysis/            # Impact blast radius analysis UI
│   │       ├── dashboard/           # Executive intelligence dashboard
│   │       ├── docs/                # Comprehensive open-source documentation
│   │       ├── pr-reviews/          # AI PR review feed, reruns, and diff inspection
│   │       ├── pull-requests/       # GitHub pull requests view
│   │       ├── repositories/        # Repository management and automation settings
│   │       ├── requirements/        # Requirement specification management & Inspector drawer
│   │       ├── traceability/        # Traceability matrix and compliance score
│   │       └── workspaces/          # Team workspace management & invite onboarding
│   ├── features/                    # Domain-driven feature components and API queries
│   │   ├── analysis/                # Blast radius UI and polling hooks
│   │   ├── jira/                    # Jira config, transition, comment, and import modals
│   │   ├── requirements/            # Requirement list, inspector drawer, and form
│   │   └── workspace/               # Workspace management and invite links
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

### Jira Cloud Webhook Setup (Local Development)

Because Jira Cloud sends webhooks from Atlassian's public servers, it cannot directly reach `http://localhost:8000`. To test webhooks locally:

1. **Start an HTTPS tunnel**:
   ```bash
   ngrok http 8000
   ```
2. **Configure in Jira**:
   - Navigate to **Settings ⚙️ &rarr; System &rarr; WebHooks &rarr; Create a WebHook**.
   - URL: `https://<your-ngrok-subdomain>.ngrok-free.app/api/v1/jira/webhook`
   - Secret: Paste the secret generated from the TraceIQ Jira Configuration modal.
   - Events: Select **Issue Updated** and **Issue Deleted**.
3. **Verify Delivery**:
   - Click **"Send Test Ping"** in TraceIQ's Jira modal, or transition an issue in Jira to see live updates reflected immediately in TraceIQ!

---

## Testing & Quality Assurance

### Backend Tests
```bash
cd backend
# Run Jira integration tests (ADF converter, client, webhooks & HMAC verification)
uv run pytest tests/jira/

# Run AI and indexing test suite
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

#### Dashboard & Workspaces
- `GET /api/v1/dashboard/summary`: Retrieve aggregated workspace metrics and recent activity.
- `GET /api/v1/workspaces`: List accessible Personal and Team Workspaces.
- `POST /api/v1/workspaces`: Create a new Team Workspace.
- `POST /api/v1/workspaces/{id}/invites`: Generate secure team invite links.
- `POST /api/v1/workspaces/join/{token}`: Accept team workspace invitation.

#### Repositories & Code Search
- `GET /api/v1/repositories`: List tracked repositories (supports `?all=true` or scoped by `X-Workspace-Id`).
- `POST /api/v1/repositories`: Connect a new repository and specify target workspace.
- `PATCH /api/v1/repositories/{id}/settings`: Update automation settings and transfer between workspaces.
- `GET /api/v1/search/code`: Execute sub-15ms hybrid RRF code search.

#### Requirements & Impact Analysis
- `GET /api/v1/requirements`: List requirements with linked Jira metadata.
- `POST /api/v1/requirements`: Create a new engineering requirement.
- `GET /api/v1/requirements/{id}/versions`: Fetch version history for a requirement.
- `POST /api/v1/requirements/{id}/analyze`: Run graph-augmented impact blast radius analysis.

#### Jira Integration & Webhooks
- `GET /api/v1/jira/config`: Retrieve Jira integration configuration status for active workspace.
- `POST /api/v1/jira/config`: Connect or update Jira domain, email, and API token.
- `POST /api/v1/jira/config/test`: Test Jira credentials on-the-fly.
- `POST /api/v1/jira/config/webhook-secret`: Generate or rotate shared webhook secret.
- `GET /api/v1/jira/projects`: List accessible Jira projects.
- `GET /api/v1/jira/issue-types`: List Jira issue types.
- `GET /api/v1/jira/statuses`: List Jira workflow statuses.
- `GET /api/v1/jira/boards`: List Kanban and Scrum boards.
- `GET /api/v1/jira/issues`: Search and filter Jira issues by JQL, project, type, sprint, or board.
- `GET /api/v1/jira/issues/{issue_key}/transitions`: Fetch dynamic workflow transitions for an issue.
- `POST /api/v1/jira/import`: Import a single Jira issue as a tracked requirement.
- `POST /api/v1/jira/import-batch`: Batch import multiple Jira issues.
- `POST /api/v1/jira/requirements/{id}/sync`: Re-sync requirement content from Jira.
- `POST /api/v1/jira/requirements/{id}/transition`: Transition Jira issue status directly with optional comment.
- `POST /api/v1/jira/requirements/{id}/post-comment`: Post Markdown/ADF analysis summary comment to Jira issue.
- `POST /api/v1/jira/webhook`: Receive inbound Jira webhooks (HMAC-SHA256 verified).
- `POST /api/v1/jira/webhook/test`: Simulate inbound Jira webhook delivery for verification.

#### Pull Request Reviews & Traceability
- `GET /api/v1/pr-reviews`: List AI PR reviews scoped by active workspace.
- `POST /api/v1/pr-reviews/{id}/rerun`: Rerun AI code review on demand.
- `GET /api/v1/traceability`: Fetch repository compliance and acceptance criteria mappings.

---

## License

This project is licensed under the MIT License.