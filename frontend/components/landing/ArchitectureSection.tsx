"use client";

import React, { useState } from "react";
import { 
  Server, 
  Cpu, 
  Database, 
  Network, 
  GitPullRequest, 
  Kanban, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  Workflow, 
  Binary, 
  FileCode2, 
  CheckCircle2, 
  Zap,
  Globe,
  Radio,
  Lock,
  GitBranch,
  ArrowDown
} from "lucide-react";

interface ArchNode {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: React.ElementType;
  badgeColor?: string;
  details: string[];
}

interface ArchTier {
  id: string;
  title: string;
  phase: string;
  description: string;
  nodes: ArchNode[];
}

export function ArchitectureSection() {
  const [highlightedTier, setHighlightedTier] = useState<string | null>(null);

  const tiers: ArchTier[] = [
    {
      id: "ingress",
      title: "1. Ingress & Client",
      phase: "ENTRY POINT",
      description: "Secure ingress with token verification and instant webhook ingestion.",
      nodes: [
        {
          id: "web-ui",
          title: "Next.js 16 Web App",
          subtitle: "App Router, TanStack Query & Zustand",
          tag: "Port 3000",
          icon: Globe,
          details: ["Sub-24ms First Paint", "Workspace Isolation", "Dark/Light Design Tokens"],
        },
        {
          id: "jira-webhook",
          title: "Jira Cloud / Server Webhooks",
          subtitle: "Native HMAC-SHA256 & ADF parser",
          tag: "HMAC Signed",
          icon: Kanban,
          details: ["Instant 200 OK ACK", "Bidirectional Sync", "ADF to Markdown"],
        },
        {
          id: "github-webhook",
          title: "GitHub App Webhooks",
          subtitle: "PR opened, synchronize & review events",
          tag: "X-Hub-Signature",
          icon: GitPullRequest,
          details: ["Payload Signature Check", "Diff Chunking", "Review Comment Dispatch"],
        },
      ],
    },
    {
      id: "gateway",
      title: "2. Async Gateway",
      phase: "ROUTING & TENANCY",
      description: "High-throughput asynchronous routing and multi-tenant security.",
      nodes: [
        {
          id: "fastapi-core",
          title: "FastAPI Async Engine",
          subtitle: "Pydantic v2 validation & OpenTelemetry",
          tag: "Port 8000",
          icon: Server,
          details: ["Async Event Loop", "Strict Schema Validation", "1,200 req/sec Concurrency"],
        },
        {
          id: "clerk-rbac",
          title: "Clerk Auth & Multi-Tenancy",
          subtitle: "Scoped context via X-Workspace-Id",
          tag: "JWT / Session",
          icon: Lock,
          details: ["Owner / Admin / Member Roles", "Expiring Invite Tokens", "Workspace Scoping"],
        },
        {
          id: "redis-broker",
          title: "Redis Task Broker",
          subtitle: "In-memory queue & live pub/sub",
          tag: "RAM Cache",
          icon: Zap,
          details: ["Zero Latency Dispatch", "Celery Task Queue", "Rate Limiter State"],
        },
      ],
    },
    {
      id: "compute",
      title: "3. AST & AI Engine",
      phase: "INTELLIGENCE CORE",
      description: "Deep semantic parsing, 2-hop graph traversal, and hybrid retrieval.",
      nodes: [
        {
          id: "treesitter-parser",
          title: "Tree-sitter AST Parser",
          subtitle: "Multi-language syntax symbol extraction",
          tag: "Native Grammars",
          icon: FileCode2,
          details: ["Python, TS, Go, Rust, Java", "Intact Function/Class Units", "2-Hop Caller Graph"],
        },
        {
          id: "gemini-embedder",
          title: "Gemini 2.0 Embeddings",
          subtitle: "384-dim dense matryoshka vectors",
          tag: "0 MB Server RAM",
          icon: Sparkles,
          details: ["Google Cloud Premier Model", "Zero Local Memory Footprint", "Hierarchical Breadcrumbs"],
        },
        {
          id: "rrf-engine",
          title: "Hybrid RRF Engine (k=60)",
          subtitle: "Vector + Tsvector + AST Symbols",
          tag: "< 15ms Latency",
          icon: Binary,
          details: ["Dense Cosine Distance", "Full-Text BM25 Ranking", "Exact Symbol Intersection"],
        },
      ],
    },
    {
      id: "storage",
      title: "4. Storage & Delivery",
      phase: "PERSISTENCE & SYNC",
      description: "ACID vector database and automated downstream delivery.",
      nodes: [
        {
          id: "pgvector-db",
          title: "PostgreSQL 15+ & pgvector",
          subtitle: "Relational tables + HNSW cosine index",
          tag: "ACID Storage",
          icon: Database,
          details: ["Cosine Vector Index", "Append-Only Audit Trails", "Alembic DB Migrations"],
        },
        {
          id: "pr-reviewer",
          title: "Automated PR Reviews",
          subtitle: "Inline diff reviews with severity badges",
          tag: "GitHub API",
          icon: ShieldCheck,
          details: ["Requirement Gap Detection", "Severity Warning Flags", "Direct PR Inline Comments"],
        },
        {
          id: "jira-sync",
          title: "Jira Bidirectional Sync",
          subtitle: "Real-time ticket status transitions",
          tag: "Live Auto-Sync",
          icon: Activity,
          details: ["Workflow Status Shift", "ADF Comment Reports", "Drift Detection Alerts"],
        },
      ],
    },
  ];

  return (
    <section id="architecture" className="py-20 md:py-28 bg-[#0D1526] text-[#F8F6F2] relative overflow-hidden">
      {/* Background Grid & Ambient Glows */}
      <div className="absolute inset-0 opacity-[0.07] bg-grid-pattern pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono tracking-wider uppercase mb-3 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>System Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-serif tracking-tight leading-[1.1] text-white">
              Engineered for high-throughput <br />
              <span className="italic text-emerald-400">
                AST code intelligence &amp; live sync
              </span>.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
              TraceIQ decouples synchronous HTTP routing, asynchronous AST extraction workers, and AI review orchestrators into an event-driven distributed system.
            </p>
          </div>

          {/* Real-time System Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md font-mono text-[11px]">
            <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
              <div className="text-slate-400 text-[9px] uppercase">RRF Latency</div>
              <div className="font-bold text-emerald-400 mt-0.5">&lt; 15 ms</div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
              <div className="text-slate-400 text-[9px] uppercase">AST Parsing</div>
              <div className="font-bold text-sky-400 mt-0.5">100k / min</div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
              <div className="text-slate-400 text-[9px] uppercase">Embeddings RAM</div>
              <div className="font-bold text-amber-400 mt-0.5">0 MB Server</div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
              <div className="text-slate-400 text-[9px] uppercase">Webhook ACK</div>
              <div className="font-bold text-emerald-400 mt-0.5">&lt; 40 ms</div>
            </div>
          </div>
        </div>

        {/* Complete Unified Architectural Blueprint Canvas */}
        <div className="relative rounded-3xl bg-[#09101F]/80 border border-white/15 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Animated Pipeline Stage Indicator Header */}
          <div className="hidden lg:flex items-center justify-between pb-6 mb-6 border-b border-white/10 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>END-TO-END CONTINUOUS DATA STREAM</span>
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Synchronous Ingress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Celery Distributed Queue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Bidirectional Delivery
              </span>
            </div>
          </div>

          {/* 4 Architectural Columns / Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative">
            {tiers.map((tier, tierIdx) => {
              const isHovered = highlightedTier === tier.id;

              return (
                <div
                  key={tier.id}
                  onMouseEnter={() => setHighlightedTier(tier.id)}
                  onMouseLeave={() => setHighlightedTier(null)}
                  className={`flex flex-col rounded-2xl border transition-all duration-300 p-4 sm:p-5 relative ${
                    isHovered
                      ? "bg-white/[0.08] border-white/30 shadow-xl scale-[1.01]"
                      : "bg-white/[0.03] border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Tier Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {tier.phase}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        0{tierIdx + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-serif font-bold text-white mt-2">
                      {tier.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans mt-1 leading-snug">
                      {tier.description}
                    </p>
                  </div>

                  {/* Node Cards Inside Tier */}
                  <div className="flex flex-col gap-3 flex-1">
                    {tier.nodes.map((node) => {
                      const IconComponent = node.icon;

                      return (
                        <div
                          key={node.id}
                          className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all group relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-serif font-bold text-xs text-white leading-tight">
                                {node.title}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-slate-300 border border-white/10 shrink-0">
                              {node.tag}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 font-sans leading-tight">
                            {node.subtitle}
                          </div>

                          {/* Technical Highlights / Bullet points */}
                          <div className="mt-2.5 pt-2 border-t border-white/[0.07] flex flex-col gap-1">
                            {node.details.map((detail, di) => (
                              <div key={di} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                                <span className="truncate">{detail}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Flow Connector Arrow to Next Tier (Desktop Only) */}
                  {tierIdx < tiers.length - 1 && (
                    <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[#16213E] border border-white/20 items-center justify-center text-emerald-400 shadow-md">
                      <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                  )}

                  {/* Down Arrow for Mobile / Tablet */}
                  {tierIdx < tiers.length - 1 && (
                    <div className="flex lg:hidden justify-center my-2 text-slate-500">
                      <ArrowDown className="w-4 h-4 animate-bounce" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Interactive Operational Workflow Strip */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs uppercase font-bold text-white tracking-wider">
                  Automated Pipeline Lifecycle
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                100% Async Non-Blocking • Zero Thread Lock
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] text-emerald-400 uppercase font-bold">Stage 1: Webhook Trigger</div>
                <div className="font-sans text-slate-200 mt-1 font-semibold text-xs">
                  GitHub PR or Jira issue event triggers instant HMAC validation.
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">ACK return: &lt; 40ms</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] text-sky-400 uppercase font-bold">Stage 2: AST Extraction</div>
                <div className="font-sans text-slate-200 mt-1 font-semibold text-xs">
                  Celery worker parses Tree-sitter AST and computes 2-hop caller graph.
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">Parallel batch parsing</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[10px] text-indigo-400 uppercase font-bold">Stage 3: Hybrid RRF Fusion</div>
                <div className="font-sans text-slate-200 mt-1 font-semibold text-xs">
                  pgvector cosine search + text search + AST symbols fused at k=60.
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">Latency: 11-14ms</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-emerald-500/30 bg-emerald-500/[0.05]">
                <div className="text-[10px] text-emerald-300 uppercase font-bold">Stage 4: Autonomous Delivery</div>
                <div className="font-sans text-slate-200 mt-1 font-semibold text-xs">
                  Posts PR reviews on GitHub &amp; shifts issue statuses on Jira.
                </div>
                <div className="text-[10px] text-emerald-400 mt-1 font-mono">Traceability recorded</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
