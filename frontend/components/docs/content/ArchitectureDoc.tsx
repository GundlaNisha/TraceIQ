"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Layers, Server, Cpu, Database, Network, ArrowRight, ShieldCheck, Kanban, GitPullRequest, Zap, Sparkles } from "lucide-react";
import { SystemArchitectureVisual } from "../architecture/SystemArchitectureVisual";

export function ArchitectureDoc() {
  return (
    <article className="space-y-12 max-w-5xl text-[15px] leading-relaxed text-[#222222]">
      
      {/* Title & Introduction */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
          Documentation // Architecture
        </div>
        <h1 id="architecture-overview" className="text-3xl sm:text-5xl font-serif font-bold text-[#111111] tracking-tight">
          System Architecture
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#555E6D] leading-relaxed">
          TraceIQ is architected as an asynchronous, event-driven distributed platform that bridges product requirements, AST code graphs, Jira issues, and pull request reviews. It strictly decouples synchronous HTTP routing from background AST extraction workers and AI review orchestrators.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Interactive Architecture Visual */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 id="architecture-diagram" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111]">
              System Topology &amp; Pipeline Data Flow
            </h2>
            <p className="text-sm text-[#555E6D] mt-1 font-sans">
              Interactive overview of the 4-tier decoupled pipeline. Toggle flow modes to inspect specific event lifecycles.
            </p>
          </div>
        </div>

        {/* Custom Interactive Architecture Component */}
        <SystemArchitectureVisual />
      </section>

      {/* The 4-Tier Decoupled Model Deep Dive */}
      <section className="space-y-6 pt-2">
        <h2 id="four-tier-model" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          The 4-Tier Decoupled Model
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Tier 1 */}
          <div className="p-6 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-3 hover:border-[#1B2A4A]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full uppercase">
                Tier 01 // Client &amp; Ingress
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                Next.js 16 + Webhooks
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-[#111111]">Client &amp; Interface Layer</h3>
            <p className="text-xs sm:text-sm text-[#555E6D] leading-relaxed">
              Next.js 16 App Router with React 19 Server &amp; Client Components, TanStack Query v5 state caching, and Zustand workspace isolation. Ingests native GitHub App webhooks and Atlassian Jira Cloud webhooks verified with HMAC-SHA256 signatures.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-mono text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Sub-24ms First Paint • X-Workspace-Id Isolation</span>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="p-6 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-3 hover:border-[#1B2A4A]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-500/10 px-2.5 py-0.5 rounded-full uppercase">
                Tier 02 // API Gateway
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                FastAPI + Redis
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-[#111111]">API &amp; Gateway Layer</h3>
            <p className="text-xs sm:text-sm text-[#555E6D] leading-relaxed">
              High-throughput async Python 3.11 REST API with Pydantic v2 validation and non-blocking background task dispatching. Employs dedicated database session lifecycles (<code className="font-mono bg-slate-100 px-1 text-xs">AsyncSessionLocal</code>) for background sync jobs to eliminate detached instance errors.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-mono text-sky-700">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>1,200 req/sec Concurrency • Redis Task Broker</span>
            </div>
          </div>

          {/* Tier 3 */}
          <div className="p-6 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-3 hover:border-[#1B2A4A]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-purple-700 bg-purple-500/10 px-2.5 py-0.5 rounded-full uppercase">
                Tier 03 // Compute Core
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                Celery + Tree-sitter
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-[#111111]">AST &amp; AI Compute Layer</h3>
            <p className="text-xs sm:text-sm text-[#555E6D] leading-relaxed">
              Distributed background workers executing Tree-sitter multi-language grammar parsing (Python, TypeScript, Go, Rust, Java, C/C++), constructing directed dependency graphs (<code className="font-mono bg-slate-100 px-1 text-xs">code_dependencies</code>), and generating dense 384d Gemini embeddings with 0 MB server RAM overhead.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-mono text-purple-700">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>100k AST Nodes/min • Hybrid RRF k=60</span>
            </div>
          </div>

          {/* Tier 4 */}
          <div className="p-6 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-3 hover:border-[#1B2A4A]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-500/10 px-2.5 py-0.5 rounded-full uppercase">
                Tier 04 // Storage &amp; Sync
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                Postgres + Jira + GitHub
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-[#111111]">Storage &amp; Delivery Layer</h3>
            <p className="text-xs sm:text-sm text-[#555E6D] leading-relaxed">
              PostgreSQL 15+ with pgvector HNSW cosine indexing. Posts automated inline pull request reviews on GitHub with severity classifications, triggers live Jira status transitions directly from the UI, and creates structured ADF comment summaries.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-mono text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>ACID Storage • Automated GitHub PR Comments</span>
            </div>
          </div>

        </div>
      </section>

      {/* Technology Stack Breakdown */}
      <section className="space-y-4 pt-2">
        <h2 id="technology-stack" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Technology Stack
        </h2>
        <div className="overflow-x-auto border border-[#1B2A4A]/15 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-[#555E6D] uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Component</th>
                <th className="px-5 py-3.5">Technology</th>
                <th className="px-5 py-3.5">Architectural Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]/10 font-mono text-xs">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Frontend Framework</td>
                <td className="px-5 py-3.5 text-accent font-bold">Next.js 16 + React 19</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">App Router, server/client components, TanStack Query v5, Zustand</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Backend Gateway</td>
                <td className="px-5 py-3.5 text-accent font-bold">FastAPI + Python 3.11</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Asynchronous REST endpoints, Pydantic v2 schemas, SQLAlchemy 2.0 async engine</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Database &amp; Vector Index</td>
                <td className="px-5 py-3.5 text-accent font-bold">PostgreSQL 15+ &amp; pgvector</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">ACID tables, HNSW cosine vector index, full-text tsvectors, Alembic migrations</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Code Graph Engine</td>
                <td className="px-5 py-3.5 text-accent font-bold">Tree-sitter Grammars</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Multi-language AST parsing (Python, TS, Go, Rust, Java), symbol extraction, 2-hop caller traversal</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Embeddings Model</td>
                <td className="px-5 py-3.5 text-accent font-bold">Google Gemini 2.0 (384d)</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Dense vector embeddings with 0 MB server RAM overhead and local fallback</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Task Queuing &amp; Cache</td>
                <td className="px-5 py-3.5 text-accent font-bold">Celery &amp; Redis</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Distributed background workers, async repo cloning/indexing, in-memory cache</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Jira Integration</td>
                <td className="px-5 py-3.5 text-accent font-bold">HMAC Webhooks &amp; REST v3</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Bidirectional sync, X-Hub-Signature validation, ADF converter, issue status transitions</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-[#111111]">Authentication &amp; RBAC</td>
                <td className="px-5 py-3.5 text-accent font-bold">Clerk Auth &amp; Workspaces</td>
                <td className="px-5 py-3.5 font-sans text-[#555E6D]">Multi-tenant session verification, team workspace invites (/join/[token]), role-based access control</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </article>
  );
}
