# TraceIQ 🧠💡

## 1️⃣ Project Overview
TraceIQ is an advanced AI-powered requirement-to-code impact analysis tool. It solves the developer's "where do I make this change?" dilemma by analyzing your Git repositories and mapping product requirements directly to the impacted source code files, accelerating development and ensuring comprehensive requirement coverage.

## 2️⃣ Features
- **Automated Impact Analysis:** Input a user story or requirement and instantly find which files and modules need modification.
- **AI-Powered PR Draft Generation:** Automatically generate comprehensive Pull Request titles and Markdown descriptions based on the impact analysis.
- **Dependency Graph Visualization:** Visually map out impacted files and their relationships within the codebase through an interactive dependency graph.
- **Secure Repository Indexing:** Seamlessly ingest and index repositories with semantic search capabilities to understand your code structure.

## 3️⃣ Tech Stack
- **Frontend (Next.js 16 App Router):** React framework for building a fast, SEO-friendly, and decoupled user interface.
- **Styling (Tailwind CSS v4 & shadcn/ui):** For highly customizable, utility-first modern UI components.
- **State Management (Zustand & TanStack Query):** Efficient client-side state handling and asynchronous data fetching.
- **Backend (FastAPI):** High-performance Python framework for building RESTful APIs.
- **Database (PostgreSQL with `pgvector`):** Relational database extended for robust vector embedding storage and semantic code search.
- **Task Queue (Celery + Redis):** Offloads long-running AI analysis and repository indexing jobs to background workers for a responsive UI.
- **AI Integration (LiteLLM):** Connects to models like DeepSeek and OpenAI for requirement analysis and generation tasks.
- **Authentication (Clerk):** Provides seamless and secure user authentication and session management.

## 4️⃣ Architecture 🔥
```mermaid
graph TD
    User([User]) --> |Interacts with| Frontend[Next.js Frontend]
    Frontend --> |Authenticates via| Clerk[Clerk Auth]
    Frontend --> |REST API Calls| Backend[FastAPI Backend]
    Backend --> |Validates Session| Clerk
    Backend --> |Syncs Data| DB[(PostgreSQL + pgvector)]
    Backend --> |Enqueues Tasks| Redis[Redis Broker]
    Redis --> |Triggers| Celery[Celery Workers]
    Celery --> |Reads/Writes Data| DB
    Celery --> |LLM Inference| LLM[LLM APIs (LiteLLM)]
    Frontend --> |Visualizes| ReactFlow[React Flow Graph]
```

## 5️⃣ Project Structure
- `backend/`: Contains the FastAPI application, Alembic database migrations, Celery worker configurations, and API route definitions (`app/main.py`, `app/modules/`).
- `frontend/`: Contains the Next.js application, React components (`components/`), Next.js pages/routes (`app/`), and Zustand state stores (`stores/`).
- `docs/` & `plan-docs/`: Project documentation and architecture plans.

## 6️⃣ Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL (with `pgvector` extension)
- Redis (for Celery)

### Backend Setup
1. Navigate to the backend directory and set up the Python environment using `uv`:
   ```bash
   cd backend
   uv sync
   source .venv/bin/activate
   ```
2. Configure your environment variables:
   ```bash
   cp .env.example .env
   # Add your PostgreSQL URL, Redis URL, Clerk Webhook secrets, and LLM API keys.
   ```
3. Run database migrations:
   ```bash
   alembic upgrade head
   ```
4. Start the FastAPI server and Celery worker (in separate terminal windows):
   ```bash
   # Start FastAPI Server
   fastapi dev app/main.py

   # Start Celery Worker
   celery -A app.workers.celery_app worker --loglevel=info
   ```

### Frontend Setup
1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Configure your environment variables:
   ```bash
   cp .env.example .env
   # Add your Clerk Publishable Key, Clerk Secret Key, and backend API URL.
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

## 7️⃣ Usage
1. **Login:** Authenticate securely using Clerk.
2. **Connect Repository:** Link your Git repository. TraceIQ will automatically index and generate vector embeddings for your codebase.
3. **Analyze Requirement:** Enter a feature description or bug fix requirement into the dashboard.
4. **Review Impact:** Wait for the asynchronous analysis to complete and review the identified files and their relationships on the interactive dependency graph.
5. **Generate PR:** With one click, generate a highly detailed Pull Request draft ready for submission.

## 8️⃣ Screenshots / Demo
*(Placeholder for actual application screenshots or GIF walkthroughs)*
- **Dashboard View:** `![Dashboard](./docs/dashboard-preview.png)`
- **Dependency Graph:** `![Graph](./docs/graph-preview.png)`

## 9️⃣ API Documentation
TraceIQ's backend provides a RESTful API built with FastAPI. The interactive OpenAPI (Swagger) documentation is automatically generated and can be accessed locally when the backend is running at:
`http://localhost:8000/docs`

### Core Endpoints Include:
- `POST /api/repos/` - Connect and index a new repository.
- `POST /api/impact/analyze` - Trigger an AI impact analysis job for a requirement.
- `GET /api/pr/draft/{analysis_id}` - Fetch a generated PR draft based on analysis results.

## 🔟 Engineering Decisions
- **Monorepo Architecture:** Next.js and FastAPI are decoupled but kept in a single repository for easier full-stack version control and context sharing.
- **Asynchronous Task Queue (Celery & Redis):** Repository indexing and LLM calls are highly resource-intensive and time-consuming. Offloading them to Celery prevents API blocking and keeps the Next.js frontend extremely responsive.
- **Vector Database (pgvector):** Chosen over dedicated vector DBs (like Pinecone) to keep architectural simplicity while effectively handling semantic code search alongside relational user data in PostgreSQL.
- **Component Styling:** Transitioned to Tailwind CSS v4 and `shadcn/ui` for rapid, headless UI component development without writing custom CSS from scratch.

## 1️⃣1️⃣ Testing
- **Backend Testing (Pytest):** Tests API endpoints, database interactions, and authentication logic.
  - *Run tests:* `cd backend && pytest`
- **Frontend Testing (Vitest & Playwright):** Vitest is configured for unit testing components, and Playwright is set up for End-to-End (E2E) workflow validation.
  - *Run unit tests:* `cd frontend && npm run test`
  - *Run E2E tests:* `cd frontend && npm run e2e`

## 1️⃣2️⃣ Limitations & Future Improvements
- **Current Limitations:**
  - Initial repository indexing can be slow for massive codebases, taking several minutes.
  - Relies heavily on external LLM rate limits which can cause queuing delays for impact analysis.
- **Future Improvements:**
  - Support for more Git providers (GitLab, Bitbucket) beyond GitHub.
  - IDE integrations (VS Code / JetBrains plugins) to pull analysis directly into the editor.
  - Deeper AST-level (Abstract Syntax Tree) code chunking for even more accurate semantic search.