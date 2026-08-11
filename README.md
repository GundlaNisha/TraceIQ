# TraceIQ 🧠💡

TraceIQ is an advanced AI-powered requirement-to-code impact analysis tool. It bridges the gap between product requirements and technical implementation by analyzing your Git repositories, structurally indexing the code, and utilizing large language models (LLMs) to accurately map product requirements directly to the impacted source code files.

By automating the heavy lifting of figuring out *"where do I make this change?"*, TraceIQ accelerates the development lifecycle, ensures comprehensive requirement coverage, and generates high-quality initial Pull Request drafts.

---

## 🎯 Key Features

- **Automated Impact Analysis:** Input a product requirement (or user story), and TraceIQ semantically searches your codebase to identify exactly which files and modules need to be modified.
- **AI-Powered PR Draft Generation:** Automatically generate comprehensive Pull Request titles and Markdown descriptions based on the impact analysis results and the original requirement.
- **Semantic Code Search & Indexing:** Codebases are ingested and indexed structurally and semantically (using pgvector embeddings), allowing for deep contextual understanding of your architecture.
- **Dependency Graph Visualization:** Visually map out impacted files and their relationships within the codebase through an interactive dependency graph.
- **Asynchronous Processing:** Long-running AI analysis jobs and PR generations are offloaded to background Celery workers, ensuring a fast and responsive user interface.
- **Secure Authentication:** Integrated with Clerk for seamless, secure user authentication and session management.

---

## 🏗️ Architecture & Tech Stack

TraceIQ is structured as a monorepo containing a modern, decoupled frontend and backend.

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4, shadcn/ui
- **State Management & Data Fetching:** Zustand, TanStack React Query
- **Authentication:** Clerk
- **Visualizations:** React Flow (for dependency graphs), React Markdown

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (with `pgvector` for embedding storage)
- **ORM:** SQLAlchemy (Async)
- **Task Queue & Workers:** Celery + Redis
- **AI Integration:** LiteLLM (supporting models like DeepSeek, OpenAI, etc.)
- **Package Management:** `uv`

---

## ⚙️ How It Works (The Workflow)

1. **Onboarding & Auth:** Users log in securely via Clerk. The frontend syncs the user session with the backend database.
2. **Repository Linking:** Users connect their Git repositories to TraceIQ. The backend ingests the repository, generates vector embeddings for the source code, and stores them in PostgreSQL.
3. **Requirement Definition:** Users define a new feature, bug fix, or product requirement.
4. **Impact Analysis:** 
   - TraceIQ triggers an asynchronous Celery job.
   - The AI engine performs a semantic search against the vector database to find relevant code chunks.
   - An LLM analyzes the requirement against the codebase and outputs a structured list of impacted files.
5. **Review & Visualization:** The user views the impacted files and their confidence scores via an interactive dashboard and dependency graph.
6. **PR Draft Generation:** With a single click, TraceIQ compiles the analysis results and requirement details to generate a polished PR description ready for GitHub.

---

## 🚀 Getting Started

This project is a monorepo containing both the frontend and backend applications.

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL (with `pgvector` extension)
- Redis (for Celery)

### 1. Backend Setup

Navigate to the backend directory and set up the Python environment using `uv`:

```bash
cd backend
uv sync
source .venv/bin/activate
```

Copy the example environment file and configure your database and API keys:

```bash
cp .env.example .env
# Edit .env with your PostgreSQL URL, Redis URL, Clerk Webhook secrets, and LLM API keys.
```

Run database migrations to initialize the schema:

```bash
alembic upgrade head
```

Start the FastAPI server and Celery worker (in separate terminal windows):

```bash
# Start FastAPI Server
fastapi dev app/main.py

# Start Celery Worker
celery -A app.workers.celery_app worker --loglevel=info
```

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Configure your environment variables:

```bash
cp .env.example .env
# Edit .env with your Clerk Publishable Key, Clerk Secret Key, and backend API URL.
```

Start the Next.js development server:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser to start using TraceIQ!