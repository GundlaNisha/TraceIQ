"use client";

import React, { useState, useEffect } from "react";
import { Search, X, BookOpen, Layers, Zap, Terminal, Shield, FolderGit2, FileText, ArrowRight } from "lucide-react";

export interface SearchDocResult {
  sectionId: string;
  category: string;
  title: string;
  snippet: string;
  keywords: string[];
}

const SEARCH_INDEX: SearchDocResult[] = [
  {
    sectionId: "getting-started",
    category: "Getting Started",
    title: "Introduction & What is TraceIQ",
    snippet: "Overview of TraceIQ: Autonomous Code Impact Analysis, AST Code Graph Indexing, and Pull Request Review Intelligence.",
    keywords: ["intro", "overview", "problem", "blindspot", "features", "capabilities"],
  },
  {
    sectionId: "getting-started",
    category: "Getting Started",
    title: "5-Minute Quickstart Guide",
    snippet: "Step-by-step guide to installing dependencies, connecting your first repo, and running impact analysis.",
    keywords: ["quickstart", "setup", "start", "install", "first repo", "run"],
  },
  {
    sectionId: "getting-started",
    category: "Getting Started",
    title: "Environment Variables Configuration",
    snippet: "Complete reference for backend .env and frontend .env.local variables including Google Gemini free embeddings key.",
    keywords: ["env", "environment", "gemini", "api key", "clerk", "database_url", "redis"],
  },
  {
    sectionId: "architecture",
    category: "Architecture",
    title: "4-Tier System Architecture",
    snippet: "Decoupled architecture: Next.js 16 Client, FastAPI Gateway, Celery Async Workers, and External Integrations.",
    keywords: ["architecture", "system", "client", "gateway", "workers", "celery", "fastapi", "diagram"],
  },
  {
    sectionId: "architecture",
    category: "Architecture",
    title: "Tree-sitter AST Parsing & Embedding Pipeline",
    snippet: "Multi-language grammar parser, semantic function/class chunker, and 384d Gemini matryoshka vector embedder.",
    keywords: ["tree-sitter", "ast", "parser", "grammars", "embeddings", "vector", "chunker"],
  },
  {
    sectionId: "core-concepts",
    category: "Core Concepts",
    title: "Sub-15ms Hybrid Code Search (RRF)",
    snippet: "Multi-signal retrieval combining pgvector cosine distance, tsvector full-text matching, and AST symbol tables.",
    keywords: ["hybrid", "search", "rrf", "reciprocal rank fusion", "pgvector", "tsvector", "latency"],
  },
  {
    sectionId: "core-concepts",
    category: "Core Concepts",
    title: "2-Hop Graph Blast Radius Analysis",
    snippet: "Deterministic graph traversal predicting impacted callers, transitive consumers, and missing test files.",
    keywords: ["blast radius", "impact", "2-hop", "graph", "risk", "traversal", "test radar"],
  },
  {
    sectionId: "core-concepts",
    category: "Core Concepts",
    title: "Automated Pull Request Code Review Engine",
    snippet: "GitHub App webhook listener, unified diff chunker, requirement gap detection, and line-level bot comments.",
    keywords: ["pr review", "pull request", "bot", "diff", "gap", "github app", "webhook"],
  },
  {
    sectionId: "core-concepts",
    category: "Core Concepts",
    title: "Traceability Matrix & Audit Health",
    snippet: "Continuous compliance score calculation linking product specs, predicted impact, and PR review verdicts.",
    keywords: ["traceability", "matrix", "compliance", "health", "audit", "soc2", "iso"],
  },
  {
    sectionId: "jira-integration",
    category: "Integrations",
    title: "Atlassian Jira REST API & Kanban Sync",
    snippet: "Import requirements directly from Jira Kanban boards, Scrum sprints, and issue keys with ADF to Markdown parsing.",
    keywords: ["jira", "kanban", "sprint", "adf", "atlassian", "import", "issues", "rest api"],
  },
  {
    sectionId: "user-guides",
    category: "User Guides",
    title: "Managing Workspaces & Team Members",
    snippet: "How to create Team Workspaces, assign RBAC roles (Owner, Admin, Member, Viewer), and generate invite links.",
    keywords: ["workspaces", "team", "rbac", "invite", "roles", "members", "join"],
  },
  {
    sectionId: "user-guides",
    category: "User Guides",
    title: "Connecting & Indexing Repositories",
    snippet: "How to connect GitHub repositories, toggle automated reviews, and transfer repos between workspaces.",
    keywords: ["repository", "connect", "github", "index", "transfer"],
  },
  {
    sectionId: "project-structure",
    category: "Codebase Guide",
    title: "Backend & Frontend Directory Structure",
    snippet: "Comprehensive walk-through of backend modules, SQLAlchemy ORM models, Alembic migrations, and frontend features.",
    keywords: ["project structure", "directories", "backend", "frontend", "models", "alembic"],
  },
  {
    sectionId: "api-reference",
    category: "API Reference",
    title: "FastAPI REST Endpoints Specification",
    snippet: "Detailed HTTP endpoints, request bodies, query params, headers (X-Workspace-Id), and responses.",
    keywords: ["api", "endpoints", "rest", "curl", "openapi", "swagger", "routes"],
  },
  {
    sectionId: "contributing",
    category: "Community",
    title: "Contributing Guidelines & Test Suite",
    snippet: "How to run pytest and Vitest, format code with Ruff, and submit high-quality pull requests.",
    keywords: ["contributing", "development", "tests", "pytest", "vitest", "ruff", "lint"],
  },
  {
    sectionId: "deployment",
    category: "DevOps & Production",
    title: "Docker & Production Deployment",
    snippet: "Multi-stage Dockerfile build, Neon/Supabase PostgreSQL setup, Celery scaling, and security hardening.",
    keywords: ["deployment", "docker", "production", "neon", "supabase", "scaling", "security"],
  },
  {
    sectionId: "troubleshooting",
    category: "Support",
    title: "Troubleshooting & FAQ",
    snippet: "Common setup issues, pgvector extension errors, Celery worker concurrency, and FAQ solutions.",
    keywords: ["troubleshooting", "errors", "issues", "faq", "pgvector", "celery error"],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSection: (sectionId: string) => void;
}

export function DocsSearchModal({ open, onOpenChange, onSelectSection }: Props) {
  const [query, setQuery] = useState("");

  // Keyboard shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const filtered = query.trim()
    ? SEARCH_INDEX.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.snippet.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        );
      })
    : SEARCH_INDEX.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#1B2A4A]/20 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#1B2A4A]/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search documentation, concepts, API endpoints..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#111111] placeholder:text-muted outline-none"
          />
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-[#1B2A4A]/5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">
              No documentation found matching &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onSelectSection(item.sectionId);
                  onOpenChange(false);
                }}
                className="pt-1.5 first:pt-0 p-3 rounded-xl hover:bg-[#F8F6F2] cursor-pointer transition-colors group flex items-center justify-between"
              >
                <div className="space-y-0.5 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#111111] group-hover:text-accent transition-colors">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#6B7280] line-clamp-1">
                    {item.snippet}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#F8F6F2] border-t border-[#1B2A4A]/10 flex items-center justify-between text-[11px] text-[#6B7280] font-mono">
          <span>Press <strong>ESC</strong> to close</span>
          <span>{SEARCH_INDEX.length} documentation topics</span>
        </div>

      </div>
    </div>
  );
}
