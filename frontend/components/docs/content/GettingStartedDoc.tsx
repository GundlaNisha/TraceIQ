"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { ArrowRight, CheckCircle2, Terminal, Sparkles, FolderGit2, AlertTriangle, ShieldCheck, Database, Server } from "lucide-react";

export function GettingStartedDoc() {
  return (
    <article className="space-y-12 max-w-5xl text-[15px] leading-relaxed text-[#222222]">
      
      {/* Title & Introduction */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
          Documentation // Getting Started
        </div>
        <h1 id="introduction" className="text-3xl sm:text-5xl font-serif font-bold text-[#111111] tracking-tight">
          Getting Started with TraceIQ
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#555E6D] leading-relaxed">
          TraceIQ is an enterprise developer platform that unifies product requirements, codebase architecture, and pull request reviews using Abstract Syntax Tree (AST) code graph traversal and sub-15ms hybrid RRF search.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* The Problem TraceIQ Solves */}
      <section className="space-y-6">
        <h2 id="why-traceiq" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Why TraceIQ?
        </h2>
        <p className="text-sm sm:text-base text-[#444444] leading-relaxed">
          In modern software engineering, pull request diffs isolate line changes in a vacuum. When a developer refactors an authorization helper, modifies a database schema, or updates a shared API contract, standard git diff tools fail to show the <strong>transitive 2-hop downstream callers</strong> across services.
        </p>

        {/* 3 Value Proposition Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-1">
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-2 hover:border-[#1B2A4A]/30 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h4 className="font-serif font-bold text-base text-[#111111]">The 2-Hop Blindspot</h4>
            <p className="text-xs sm:text-sm text-[#555E6D] leading-relaxed">
              73% of production regressions stem from unmapped transitive callers untouched in the immediate diff.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-2 hover:border-[#1B2A4A]/30 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="font-serif font-bold text-base text-[#111111]">Requirement Drift</h4>
            <p className="text-xs sm:text-sm text-[#555E6D] leading-relaxed">
              Code silently diverges from Jira specs across multi-round reviews without automated AST compliance checks.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-2 hover:border-[#1B2A4A]/30 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-serif font-bold text-base text-[#111111]">Manual Audit Tables</h4>
            <p className="text-xs sm:text-sm text-[#555E6D] leading-relaxed">
              Static spreadsheets rot the moment code is refactored, exposing teams to compliance violations.
            </p>
          </div>
        </div>
      </section>

      {/* 5-Minute Quickstart */}
      <section className="space-y-6 pt-2">
        <h2 id="quickstart" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          5-Minute Quickstart
        </h2>
        <p className="text-sm sm:text-base text-[#444444]">
          Follow these steps to clone, configure, and launch TraceIQ locally on your development machine:
        </p>

        <div className="space-y-8">
          {/* Step 1 */}
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#111111] flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#1B2A4A] text-white flex items-center justify-center text-xs font-mono font-bold">1</span>
              <span>Clone the Repository</span>
            </h3>
            <DocsCodeBlock
              code="git clone https://github.com/GundlaNisha/TraceIQ.git&#10;cd TraceIQ"
              language="bash"
              filename="Terminal"
            />
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#111111] flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#1B2A4A] text-white flex items-center justify-center text-xs font-mono font-bold">2</span>
              <span>Backend Setup with Python &amp; uv</span>
            </h3>
            <p className="text-sm text-[#555E6D]">
              The backend uses <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono font-semibold">uv</code> for rapid Python virtual environment and dependency management.
            </p>
            <DocsCodeBlock
              code={`cd backend
uv sync
source .venv/bin/activate
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000`}
              language="bash"
              filename="Terminal 1 (Backend API)"
            />
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#111111] flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#1B2A4A] text-white flex items-center justify-center text-xs font-mono font-bold">3</span>
              <span>Frontend Setup with Next.js 16</span>
            </h3>
            <p className="text-sm text-[#555E6D]">
              Launch the Next.js 16 App Router interface connected to your local backend:
            </p>
            <DocsCodeBlock
              code={`cd ../frontend
npm install -g pnpm  # or use npm
npm install
cp .env.example .env.local
npm run dev`}
              language="bash"
              filename="Terminal 2 (Frontend UI)"
            />
          </div>
        </div>

        <DocsCallout type="tip" title="100% Free Embeddings with Google Gemini">
          TraceIQ uses Google&apos;s premier <code>gemini-embedding-2</code> model for dense 384-dimensional embeddings. It incurs 0 MB server RAM overhead and is completely free via Google AI Studio. Get your API key from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-accent">aistudio.google.com</a>.
        </DocsCallout>
      </section>

      {/* System Prerequisites */}
      <section className="space-y-4 pt-2">
        <h2 id="prerequisites" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          System Prerequisites
        </h2>
        <div className="overflow-x-auto border border-[#1B2A4A]/15 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-[#555E6D] uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Component</th>
                <th className="px-5 py-3.5">Required Version</th>
                <th className="px-5 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]/10 font-mono text-xs">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Python</td>
                <td className="px-5 py-3.5 text-accent font-bold">3.11+</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Managed via Astral uv</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Node.js</td>
                <td className="px-5 py-3.5 text-accent font-bold">18.17+ / 20+</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Next.js 16 App Router &amp; React 19</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">PostgreSQL</td>
                <td className="px-5 py-3.5 text-accent font-bold">15+ with pgvector</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Supports Neon, Supabase, or local Docker</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Redis</td>
                <td className="px-5 py-3.5 text-accent font-bold">6.0+ (Optional)</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Optional if CELERY_ALWAYS_EAGER=true in local dev</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Environment Configuration */}
      <section className="space-y-4 pt-2">
        <h2 id="environment-variables" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Environment Configuration Reference
        </h2>
        <p className="text-sm text-[#555E6D]">
          Configure the following keys in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">backend/.env</code> and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">frontend/.env.local</code>:
        </p>

        <div className="space-y-4">
          <DocsCodeBlock
            code={`# PostgreSQL with pgvector extension
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/traceiq

# Redis & Background Tasks
REDIS_URL=redis://localhost:6379/0
CELERY_ALWAYS_EAGER=true  # Set true for in-process local dev without running celery worker

# Google Gemini Free Embeddings & LLM
GEMINI_API_KEY=AIzaSy...  # Free https://aistudio.google.com/
EMBEDDING_MODEL=models/gemini-embedding-2
EMBEDDING_DIMENSION=384
LLM_MODEL=gemini/gemini-1.5-flash

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Jira Webhook HMAC Secret
JIRA_WEBHOOK_SECRET=your-secure-shared-secret`}
            language="bash"
            filename="backend/.env"
          />

          <DocsCodeBlock
            code={`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000`}
            language="bash"
            filename="frontend/.env.local"
          />
        </div>
      </section>

    </article>
  );
}
