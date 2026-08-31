"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { FolderGit2, FileCode2, Database } from "lucide-react";

export function ProjectStructureDoc() {
  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // Codebase Guide
        </div>
        <h1 id="project-structure" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          Project Structure &amp; Codebase Guide
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          Detailed directory hierarchy and modular architecture for both the FastAPI Python backend and the Next.js 16 TypeScript frontend.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Directory Tree */}
      <section className="space-y-4">
        <h2 id="repository-tree" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Repository Directory Tree
        </h2>

        <DocsCodeBlock
          code={`TraceIQ/
├── backend/
│   ├── app/
│   │   ├── ai/                      # LLM prompts, context builders, and LiteLLM adapters
│   │   ├── core/                    # Settings (Pydantic), deps, exceptions, and security
│   │   ├── db/                      # SQLAlchemy async engine, sessionmaker, and Alembic migrations
│   │   ├── integrations/            # External clients (JiraClient, ADF Converter, GitHub App)
│   │   │   └── jira/                # Jira REST API client & Atlassian Document Format parser
│   │   ├── modules/                 # Domain-driven modular service layers
│   │   │   ├── audit/               # AuditLog ORM models and activity tracking
│   │   │   ├── auth/                # Clerk JWT auth & user synchronization
│   │   │   ├── dashboard/           # Summary KPI metrics and activity streams
│   │   │   ├── github/              # GitHub App installation, webhooks, and commit status
│   │   │   ├── impact/              # Blast radius jobs, graph traversal, and risk scoring
│   │   │   ├── indexing/            # Tree-sitter AST parsers, semantic chunkers, and embedders
│   │   │   ├── jira/                # Jira integration CRUD, Kanban board & issue search routes
│   │   │   ├── pr/                  # Pull request metadata models and synchronizer
│   │   │   ├── repository/          # Repository CRUD, settings, and workspace transfer
│   │   │   ├── requirement/         # Requirement specifications and version history
│   │   │   ├── retrieval/           # Hybrid search (pgvector + Text + Symbols RRF)
│   │   │   ├── review/              # PR review models, patch chunker, and bot comments
│   │   │   ├── traceability/        # Traceability Matrix compliance calculations
│   │   │   └── workspace/           # Multi-tenant workspaces, invites, and RBAC
│   │   ├── workers/                 # Celery background tasks (indexing, PR review jobs)
│   │   └── main.py                  # FastAPI application entrypoint & route registration
│   ├── Dockerfile                   # Multi-stage production container build
│   ├── pyproject.toml               # Python dependencies managed via uv
│   └── tests/                       # Pytest unit & integration test suites
│
├── frontend/
│   ├── app/                         # Next.js 16 App Router
│   │   ├── (protected)/             # Authenticated workspace application routes
│   │   │   ├── analysis/            # Blast radius analysis UI
│   │   │   ├── dashboard/           # Executive KPI dashboard & activity feeds
│   │   │   ├── pr-reviews/          # AI PR review feed & diff chunk viewer
│   │   │   ├── pull-requests/       # Pull requests table view
│   │   │   ├── repositories/        # Repository management & automation settings
│   │   │   ├── requirements/        # Requirements & Jira import triggers
│   │   │   ├── traceability/        # Traceability matrix & compliance scoring
│   │   │   └── workspaces/          # Workspace management & invite generation
│   │   ├── docs/                    # Public Documentation Portal
│   │   ├── page.tsx                 # Public landing page
│   │   └── layout.tsx               # Root HTML layout with ClerkProvider
│   ├── components/                  # Reusable UI components (landing, docs, ui)
│   ├── features/                    # Domain-driven features (analysis, jira, requirements...)
│   ├── lib/                         # API client, TypeScript types, and utilities
│   ├── stores/                      # Zustand state stores (workspace selection)
│   └── package.json                 # Frontend dependencies & scripts`}
          language="text"
          filename="Full Directory Hierarchy"
        />
      </section>

      {/* Database Schema Models */}
      <section className="space-y-4 pt-4">
        <h2 id="database-models" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Database Schema &amp; ORM Models
        </h2>
        <div className="overflow-x-auto border border-[#1B2A4A]/10 rounded-xl bg-white">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-[#6B7280] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Table Name</th>
                <th className="px-4 py-2.5">Key Columns</th>
                <th className="px-4 py-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]/10">
              <tr>
                <td className="px-4 py-2.5 font-bold text-[#111111]">workspaces</td>
                <td className="px-4 py-2.5 text-[#6B7280]">id, name, slug, is_personal</td>
                <td className="px-4 py-2.5 font-sans">Multi-tenant workspace isolation container</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-[#111111]">workspace_members</td>
                <td className="px-4 py-2.5 text-[#6B7280]">workspace_id, user_id, role</td>
                <td className="px-4 py-2.5 font-sans">RBAC membership roles (Owner, Admin, Member, Viewer)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-[#111111]">repositories</td>
                <td className="px-4 py-2.5 text-[#6B7280]">id, workspace_id, name, default_branch</td>
                <td className="px-4 py-2.5 font-sans">Tracked code repositories scoped by workspace</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-[#111111]">code_chunks</td>
                <td className="px-4 py-2.5 text-[#6B7280]">id, file_id, embedding (vector 384)</td>
                <td className="px-4 py-2.5 font-sans">AST semantic code chunks with pgvector cosine index</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-[#111111]">code_dependencies</td>
                <td className="px-4 py-2.5 text-[#6B7280]">source_symbol_id, target_symbol_id</td>
                <td className="px-4 py-2.5 font-sans">Directed AST dependency graph for 2-hop traversal</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-[#111111]">requirements</td>
                <td className="px-4 py-2.5 text-[#6B7280]">id, title, text, jira_issue_key</td>
                <td className="px-4 py-2.5 font-sans">Product requirements with version history and Jira metadata</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-[#111111]">jira_integrations</td>
                <td className="px-4 py-2.5 text-[#6B7280]">workspace_id, jira_domain, jira_email</td>
                <td className="px-4 py-2.5 font-sans">Encrypted Jira REST API connection credentials</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-[#111111]">pr_reviews</td>
                <td className="px-4 py-2.5 text-[#6B7280]">id, pr_id, findings (JSON), verdict</td>
                <td className="px-4 py-2.5 font-sans">Autonomous PR review results and line comments</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </article>
  );
}
