"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Layers, Server, Cpu, Database, Network, ArrowRight } from "lucide-react";

export function ArchitectureDoc() {
  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // Architecture
        </div>
        <h1 id="architecture-overview" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          System Architecture
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          TraceIQ is architected as an asynchronous, event-driven platform separating interface rendering, gateway API queries, background AST worker pipelines, and external integrations.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* 4-Tier Architecture */}
      <section className="space-y-4">
        <h2 id="four-tier-model" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          The 4-Tier Decoupled Model
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tier 1 */}
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-accent uppercase">Tier 01</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">Next.js 16</span>
            </div>
            <h3 className="font-serif font-bold text-base text-[#111111]">Client &amp; Interface Layer</h3>
            <p className="text-xs text-[#6B7280]">
              React 19 Server &amp; Client Components, TanStack Query v5 state caching, and Zustand active workspace scoping.
            </p>
          </div>

          {/* Tier 2 */}
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-accent uppercase">Tier 02</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">FastAPI</span>
            </div>
            <h3 className="font-serif font-bold text-base text-[#111111]">API &amp; Gateway Layer</h3>
            <p className="text-xs text-[#6B7280]">
              High-throughput async Python 3.11 REST API with Pydantic v2 validation, non-blocking lifespan migrations, and pgvector cosine indexing.
            </p>
          </div>

          {/* Tier 3 */}
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-accent uppercase">Tier 03</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">Celery + Tree-sitter</span>
            </div>
            <h3 className="font-serif font-bold text-base text-[#111111]">Async Worker Layer</h3>
            <p className="text-xs text-[#6B7280]">
              Distributed background workers executing Tree-sitter AST symbol parsing, dependency graph creation, and 384d Gemini embedding generation.
            </p>
          </div>

          {/* Tier 4 */}
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-accent uppercase">Tier 04</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">GitHub &amp; Jira API</span>
            </div>
            <h3 className="font-serif font-bold text-base text-[#111111]">External Integrations Layer</h3>
            <p className="text-xs text-[#6B7280]">
              Bidirectional GitHub App webhook listener, inline PR review commenter, Jira REST API Kanban/Sprint importer, and LiteLLM model router.
            </p>
          </div>

        </div>
      </section>

      {/* Mermaid Architecture Flow */}
      <section className="space-y-4 pt-4">
        <h2 id="architecture-diagram" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Architecture &amp; Data Pipeline Flow
        </h2>

        <div className="p-4 rounded-xl bg-[#1B2A4A] text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed border border-white/10">
          <pre className="text-emerald-400 font-bold mb-2">SYSTEM TOPOLOGY &amp; WORKFLOW PIPELINE:</pre>
          <pre className="text-slate-300">{`[ Developer IDE ]  ──>  git push  ──>  [ GitHub / Jira ]
                                          │ (Webhooks)
                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Gateway (Port 8000)             │
│  - JWT Verification (Clerk)                                │
│  - Workspace Header Scoping (X-Workspace-Id)                │
│  - Sub-15ms Hybrid Search (pgvector + tsvector + symbols)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Dispatch)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Redis Broker & Celery Worker                │
│  - Multi-Language Tree-sitter AST Symbol Extractor          │
│  - Hierarchical Context Breadcrumb Chunker                  │
│  - 384-Dim Gemini Embedder (0 MB Server RAM)                │
│  - 2-Hop Graph Traversal Engine                             │
│  - LiteLLM Review Dispatcher & Patch Evaluator              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL + pgvector (ACID)                │
│  - repositories, code_files, code_chunks (embeddings)       │
│  - code_symbols, code_dependencies (AST Directed Graph)    │
│  - requirements, requirement_versions, pr_reviews           │
│  - jira_integrations, workspaces, workspace_members        │
└─────────────────────────────────────────────────────────────┘`}</pre>
        </div>
      </section>

      {/* Technology Stack Breakdown */}
      <section className="space-y-4 pt-4">
        <h2 id="technology-stack" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Technology Stack
        </h2>
        <div className="overflow-x-auto border border-[#1B2A4A]/10 rounded-xl bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-[#6B7280] uppercase font-mono text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Domain</th>
                <th className="px-4 py-2.5">Technology</th>
                <th className="px-4 py-2.5">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]/10 font-mono">
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Frontend Framework</td>
                <td className="px-4 py-3 text-accent font-bold">Next.js 16 (App Router) + React 19</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Server-rendered layouts, dynamic routing, and fast client state</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Backend Gateway</td>
                <td className="px-4 py-3 text-accent font-bold">FastAPI + Python 3.11</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Async REST API with Pydantic v2 schemas and SQLAlchemy 2.0</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Database &amp; Vectors</td>
                <td className="px-4 py-3 text-accent font-bold">PostgreSQL 15+ &amp; pgvector</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">ACID relational storage, full-text tsvectors, and 384d vector indexing</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Code Parsing</td>
                <td className="px-4 py-3 text-accent font-bold">Tree-sitter Grammars</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Native multi-language AST extraction and symbol table mapping</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Task Queuing</td>
                <td className="px-4 py-3 text-accent font-bold">Celery &amp; Redis</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Distributed worker queue with in-memory eager fallback</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-[#111111]">Authentication</td>
                <td className="px-4 py-3 text-accent font-bold">Clerk Auth</td>
                <td className="px-4 py-3 font-sans text-[#6B7280]">Multi-tenant session verification, profile sync, and RBAC</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </article>
  );
}
