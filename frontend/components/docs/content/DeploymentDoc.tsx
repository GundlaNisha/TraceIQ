"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Server, Database, Shield, Lock, Cpu } from "lucide-react";

export function DeploymentDoc() {
  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // DevOps &amp; Production
        </div>
        <h1 id="deployment-guide" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          Deployment &amp; Production Operations
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          Best practices for containerizing, provisioning databases, scaling Celery background workers, and securing production TraceIQ deployments.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Docker Build */}
      <section className="space-y-4">
        <h2 id="docker-container" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Docker Containerization
        </h2>
        <p>
          TraceIQ includes an optimized multi-stage <code className="font-mono bg-slate-100 px-1">Dockerfile</code> in <code className="font-mono bg-slate-100 px-1">backend/</code> using Astral <code className="font-mono bg-slate-100 px-1">uv</code> for lightweight production container images:
        </p>

        <DocsCodeBlock
          code={`# Build Backend Docker Image
cd backend
docker build -t traceiq-backend:latest .

# Run Backend Container
docker run -p 8000:8000 \\
  -e DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/traceiq" \\
  -e GEMINI_API_KEY="your-gemini-key" \\
  -e CLERK_SECRET_KEY="sk_live_..." \\
  traceiq-backend:latest`}
          language="bash"
          filename="Docker Deployment"
        />
      </section>

      {/* Database Setup */}
      <section className="space-y-4 pt-4">
        <h2 id="database-provisioning" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Database Provisioning (Neon / Supabase PostgreSQL)
        </h2>
        <p>
          TraceIQ requires PostgreSQL 15+ with the <code className="font-mono bg-slate-100 px-1">pgvector</code> extension. Run this SQL query once on your database before running Alembic migrations:
        </p>

        <DocsCodeBlock
          code="CREATE EXTENSION IF NOT EXISTS vector;"
          language="sql"
          filename="Database Initialization"
        />

        <p className="text-xs text-[#6B7280]">
          Then apply Alembic migrations: <code className="font-mono bg-slate-100 px-1">uv run alembic upgrade head</code>.
        </p>
      </section>

      {/* Celery Scaling */}
      <section className="space-y-4 pt-4">
        <h2 id="celery-scaling" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Celery Worker Scaling &amp; Concurrency
        </h2>
        <p>
          In high-volume production environments, run dedicated Celery worker containers connected to a managed Redis instance:
        </p>

        <DocsCodeBlock
          code={`# Set CELERY_ALWAYS_EAGER=false in backend/.env
# Launch Celery worker with 4 concurrent worker processes:
uv run celery -A app.workers.celery_app worker --loglevel=info -c 4 -Q default,indexing,reviews`}
          language="bash"
          filename="Production Celery Worker"
        />
      </section>

      {/* Security Best Practices */}
      <section className="space-y-4 pt-4">
        <h2 id="security-hardening" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Security &amp; Compliance Hardening
        </h2>
        <ul className="space-y-2 text-xs text-[#111111]">
          <li>• <strong>JWT &amp; RBAC Validation:</strong> Every incoming request verifies the user session token and enforces workspace membership permissions.</li>
          <li>• <strong>Encrypted Credentials:</strong> Jira API tokens and GitHub App private keys are stored securely and masked in all API responses.</li>
          <li>• <strong>Webhook Verification:</strong> Clerk webhooks verify Svix signatures (<code className="font-mono">CLERK_WEBHOOK_SECRET</code>) and GitHub webhooks verify HMAC-SHA256 signatures (<code className="font-mono">GITHUB_WEBHOOK_SECRET</code>).</li>
          <li>• <strong>CORS Isolation:</strong> Ensure <code className="font-mono">ALLOWED_ORIGINS</code> only includes trusted production domains.</li>
        </ul>
      </section>

    </article>
  );
}
