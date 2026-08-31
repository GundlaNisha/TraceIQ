"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { ArrowRight, CheckCircle2, Terminal, Sparkles, FolderGit2 } from "lucide-react";

export function GettingStartedDoc() {
  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title & Lead */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // Getting Started
        </div>
        <h1 id="introduction" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          Getting Started with TraceIQ
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          TraceIQ is an enterprise-grade developer platform that unifies product requirements, codebase architecture, and pull request reviews using Abstract Syntax Tree (AST) code graph traversal and hybrid RRF search.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* The Problem TraceIQ Solves */}
      <section className="space-y-4">
        <h2 id="why-traceiq" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Why TraceIQ?
        </h2>
        <p>
          In modern software engineering, pull request diffs isolate line changes in a vacuum. When a developer refactors an authorization helper, modifies a database schema, or updates a shared API contract, standard git diff tools fail to show the <strong>transitive 2-hop downstream callers</strong> across services.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/10 shadow-2xs">
            <h4 className="font-serif font-bold text-sm text-[#111111]">The 2-Hop Blindspot</h4>
            <p className="text-xs text-[#6B7280] mt-1">
              73% of production regressions stem from unmapped transitive callers untouched in the immediate diff.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/10 shadow-2xs">
            <h4 className="font-serif font-bold text-sm text-[#111111]">Requirement Drift</h4>
            <p className="text-xs text-[#6B7280] mt-1">
              Code silently diverges from Jira specs across multi-round reviews without automated AST compliance checks.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/10 shadow-2xs">
            <h4 className="font-serif font-bold text-sm text-[#111111]">Manual Audit Tables</h4>
            <p className="text-xs text-[#6B7280] mt-1">
              Static spreadsheets rot the moment code is refactored, exposing teams to compliance violations.
            </p>
          </div>
        </div>
      </section>

      {/* 5-Minute Quickstart */}
      <section className="space-y-4 pt-4">
        <h2 id="quickstart" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          5-Minute Quickstart
        </h2>
        <p>
          Follow these steps to clone, configure, and launch TraceIQ locally:
        </p>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-2">
            <h3 className="font-serif font-bold text-sm text-[#111111] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white flex items-center justify-center text-[10px] font-mono">1</span>
              <span>Clone the Repository</span>
            </h3>
            <DocsCodeBlock
              code="git clone https://github.com/GundlaNisha/TraceIQ.git\ncd TraceIQ"
              language="bash"
            />
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <h3 className="font-serif font-bold text-sm text-[#111111] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white flex items-center justify-center text-[10px] font-mono">2</span>
              <span>Backend Setup with Python &amp; uv</span>
            </h3>
            <p className="text-xs text-[#6B7280]">
              The backend uses <code className="bg-slate-100 px-1.5 py-0.5 rounded">uv</code> for instant Python dependency resolution.
            </p>
            <DocsCodeBlock
              code="cd backend\nuv sync\nsource .venv/bin/activate\ncp .env.example .env\nuv run alembic upgrade head\nuv run uvicorn app.main:app --reload --port 8000"
              language="bash"
              filename="Terminal 1 (Backend API)"
            />
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <h3 className="font-serif font-bold text-sm text-[#111111] flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white flex items-center justify-center text-[10px] font-mono">3</span>
              <span>Frontend Setup with Next.js 16</span>
            </h3>
            <DocsCodeBlock
              code="cd ../frontend\nnpm install\ncp .env.example .env.local\nnpm run dev"
              language="bash"
              filename="Terminal 2 (Frontend UI)"
            />
          </div>
        </div>

        <DocsCallout type="tip" title="100% Free Embeddings with Google Gemini">
          TraceIQ uses Google&apos;s premier <code className="font-mono">gemini/gemini-embedding-2</code> model for dense 384-dimensional embeddings. It incurs <strong>0 MB server RAM overhead</strong> and is completely free via Google AI Studio. Get your API key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-semibold">aistudio.google.com</a>.
        </DocsCallout>
      </section>

      {/* Prerequisites */}
      <section className="space-y-4 pt-4">
        <h2 id="prerequisites" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          System Prerequisites
        </h2>
        <div className="overflow-x-auto border border-[#1B2A4A]/10 rounded-xl bg-white">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-[#6B7280] uppercase">
              <tr>
                <th className="px-4 py-2.5">Component</th>
                <th className="px-4 py-2.5">Required Version</th>
                <th className="px-4 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]/10">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Python</td>
                <td className="px-4 py-3 text-accent font-bold">3.11+</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Managed via Astral <code>uv</code></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Node.js</td>
                <td className="px-4 py-3 text-accent font-bold">18.17+ / 20+</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Next.js 16 App Router &amp; React 19</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">PostgreSQL</td>
                <td className="px-4 py-3 text-accent font-bold">15+ with pgvector</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Supports Neon, Supabase, or local Docker</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Redis</td>
                <td className="px-4 py-3 text-accent font-bold">6.0+ (Optional)</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Optional if <code>CELERY_ALWAYS_EAGER=true</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Environment Variable Configuration */}
      <section className="space-y-4 pt-4">
        <h2 id="environment-variables" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Environment Configuration Reference
        </h2>
        <p>
          Configure the following keys in <code className="font-mono">backend/.env</code> and <code className="font-mono">frontend/.env.local</code>:
        </p>

        <h4 className="font-serif font-bold text-sm text-[#111111] mt-4">Backend (<code className="font-mono text-xs">backend/.env</code>)</h4>
        <DocsCodeBlock
          code={`# PostgreSQL with pgvector extension
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/traceiq

# Redis & Background Tasks
REDIS_URL=redis://localhost:6379/0
CELERY_ALWAYS_EAGER=true  # Set true for in-process local dev without running celery worker

# Google Gemini Free Embeddings & LLM
GEMINI_API_KEY=AIzaSy...  # From https://aistudio.google.com/
EMBEDDING_MODEL=gemini/gemini-embedding-2
EMBEDDING_DIMENSIONS=384
LLM_MODEL=gemini/gemini-1.5-flash

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# GitHub App Integration (Optional for local testing)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=""
GITHUB_WEBHOOK_SECRET=

# Network & CORS
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=["http://localhost:3000"]`}
          language="env"
          filename="backend/.env"
        />

        <h4 className="font-serif font-bold text-sm text-[#111111] mt-4">Frontend (<code className="font-mono text-xs">frontend/.env.local</code>)</h4>
        <DocsCodeBlock
          code={`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GITHUB_APP_NAME=traceiq-official`}
          language="env"
          filename="frontend/.env.local"
        />
      </section>

    </article>
  );
}
