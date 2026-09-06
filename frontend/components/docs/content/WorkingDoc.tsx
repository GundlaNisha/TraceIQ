"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { WorkingWorkflowVisual } from "../architecture/WorkingWorkflowVisual";
import { 
  Globe, 
  Layers, 
  Workflow, 
  FileCode2, 
  Sparkles, 
  Network, 
  ShieldCheck, 
  GitPullRequest, 
  Kanban, 
  Database, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Cpu,
  Clock,
  Radio,
  FileCheck
} from "lucide-react";

export function WorkingDoc() {
  return (
    <article className="space-y-12 w-full max-w-none text-[15px] leading-relaxed text-[#222222]">
      
      {/* Title & Introduction */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
          Documentation // Application Working &amp; Lifecycle
        </div>
        <h1 id="working-overview" className="text-3xl sm:text-5xl font-serif font-bold text-[#111111] tracking-tight">
          How TraceIQ Works
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#555E6D] leading-relaxed">
          TraceIQ is an autonomous codebase intelligence and PR verification engine. It bridges product specifications in Jira with multi-language code graphs and pull requests in GitHub, calculating the exact 2-hop blast radius of any code change before it merges.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Interactive Lifecycle Workflow */}
      <section className="space-y-4">
        <div>
          <h2 id="lifecycle-pipeline" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111]">
            End-to-End Execution Pipeline
          </h2>
          <p className="text-sm text-[#555E6D] mt-1 font-sans">
            TraceIQ operates as a 5-stage asynchronous pipeline. Click through each stage below to inspect the trigger payload, internal engine processing, and deterministic output.
          </p>
        </div>

        {/* Interactive Step-by-Step Visual Component */}
        <WorkingWorkflowVisual />
      </section>

      {/* Stage 1: Ingestion & Asynchronous Decoupling */}
      <section className="space-y-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-mono font-bold text-xs">
            01
          </div>
          <h2 id="step-1-ingestion" className="text-2xl font-serif font-bold text-[#111111]">
            1. Ingestion &amp; Asynchronous Decoupling
          </h2>
        </div>

        <p>
          Whenever a developer opens or updates a pull request on GitHub, or a product manager creates or transitions an issue in Jira Cloud, an inbound webhook event hits TraceIQ&apos;s REST gateway.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 uppercase">
              <Globe className="w-4 h-4" />
              <span>Inbound Verification</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              TraceIQ validates the webhook authenticity using cryptographic <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">HMAC-SHA256</code> signatures against your workspace secret. Invalid signatures are rejected with an immediate 401 Unauthorized.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-600 uppercase">
              <Clock className="w-4 h-4" />
              <span>Sub-30ms Instant ACK</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              TraceIQ returns an immediate <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">200 OK</code> acknowledgement to GitHub and Jira in under 30ms. Heavy AST parsing and LLM reviews are queued as background Celery tasks, preventing webhook timeouts.
            </p>
          </div>
        </div>

        <DocsCodeBlock
          language="json"
          filename="Inbound Webhook ACK Lifecycle"
          code={`// 1. Inbound Request hits FastAPI Gateway (Port 8000)
POST /api/v1/github/webhook
Header: X-Hub-Signature-256: sha256=d57b44a...
Header: X-Workspace-Id: ws_77a91bf...

// 2. Gateway verifies HMAC signature & schedules Celery task in Redis
{"status": "queued", "task_id": "celery-task-90214", "latency_ms": 18.4}

// 3. Background Celery Worker picks up task with isolated DB session`}
        />
      </section>

      {/* Stage 2: Whole-Repo AST Code Graphing */}
      <section className="space-y-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-mono font-bold text-xs">
            02
          </div>
          <h2 id="step-2-ast-graph" className="text-2xl font-serif font-bold text-[#111111]">
            2. Whole-Repo AST Code Graphing
          </h2>
        </div>

        <p>
          Standard code search tools treat source code as plain text and split files using arbitrary line counts (e.g. 50 lines per chunk). This truncates functions in the middle and loses semantic context. TraceIQ uses native <strong>Tree-sitter grammars</strong> to parse code into an Abstract Syntax Tree (AST).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="text-xs font-mono font-bold text-purple-700 mb-1">Semantic Code Units</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Functions, methods, and classes remain 100% intact with docstrings, parameters, type annotations, and return types preserved.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="text-xs font-mono font-bold text-purple-700 mb-1">Hierarchical Breadcrumbs</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every chunk is tagged with its parent context: <code className="font-mono text-[11px] bg-slate-100 px-1">Repo &gt; Module &gt; Class &gt; Method</code> for deterministic search accuracy.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="text-xs font-mono font-bold text-purple-700 mb-1">Directed Call Graph</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Identifies function invocation sites and populates directed caller-callee edges in the persistent <code className="font-mono text-[11px] bg-slate-100 px-1">code_dependencies</code> table.
            </p>
          </div>
        </div>

        <DocsCallout type="tip" title="Multi-Language Support">
          TraceIQ includes native Tree-sitter parsers for Python, TypeScript, JavaScript, Go, Rust, Java, and C/C++. The engine processes up to 100,000 AST nodes per minute with zero CPU lockup.
        </DocsCallout>
      </section>

      {/* Stage 3: Sub-15ms Tri-Signal Hybrid Search */}
      <section className="space-y-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-mono font-bold text-xs">
            03
          </div>
          <h2 id="step-3-hybrid-rrf" className="text-2xl font-serif font-bold text-[#111111]">
            3. Sub-15ms Tri-Signal Hybrid Search (RRF k=60)
          </h2>
        </div>

        <p>
          When a Jira requirement needs to be verified against the codebase, or when a PR diff is analyzed, TraceIQ must identify the relevant files and functions. Pure vector search misses exact symbol names, while pure keyword search misses conceptual matches.
        </p>

        <p>
          TraceIQ queries <strong>three independent signals simultaneously</strong> in a single PostgreSQL transaction and merges candidate rankings using Reciprocal Rank Fusion (RRF):
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Signal 1: Dense Vectors
            </div>
            <p className="text-xs text-slate-600">
              Google Gemini 2.0 generates 384-dimensional dense vectors matched via HNSW cosine indexing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-700">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Signal 2: Keyword BM25
            </div>
            <p className="text-xs text-slate-600">
              PostgreSQL <code className="font-mono text-[11px] bg-slate-100 px-1">tsvector</code> executes linguistic stemming and exact identifier keyword matching.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-700">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Signal 3: AST Symbols
            </div>
            <p className="text-xs text-slate-600">
              Direct symbol matching against the <code className="font-mono text-[11px] bg-slate-100 px-1">code_dependencies</code> graph to ensure exact call sites are prioritized.
            </p>
          </div>
        </div>

        <DocsCodeBlock
          language="sql"
          filename="Reciprocal Rank Fusion (k=60) Formula in PostgreSQL"
          code={`-- Fusing three signals into a unified reciprocal score in < 15ms
SELECT chunk_id,
       COALESCE(1.0 / (60 + vector_rank), 0.0) +
       COALESCE(1.0 / (60 + keyword_rank), 0.0) +
       COALESCE(1.0 / (60 + symbol_rank), 0.0) AS rrf_score
FROM candidate_ranks
ORDER BY rrf_score DESC
LIMIT 10;`}
        />
      </section>

      {/* Stage 4: 2-Hop Blast Radius Calculation */}
      <section className="space-y-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-mono font-bold text-xs">
            04
          </div>
          <h2 id="step-4-blast-radius" className="text-2xl font-serif font-bold text-[#111111]">
            4. 2-Hop Blast Radius Calculation
          </h2>
        </div>

        <p>
          The core differentiator of TraceIQ is understanding <strong>what breaks downstream before code is merged</strong>. When a PR modifies a function signature or logic:
        </p>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs font-mono">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Blast Radius Traversal Mechanics
            </span>
            <span className="text-emerald-700 font-bold">
              Sub-25ms Recursive Graph Walk
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
              <div className="font-bold text-amber-900 mb-1">0. Changed Function</div>
              <p className="text-slate-600 font-sans leading-relaxed">
                Developer modifies <code className="font-mono bg-white px-1 rounded">calculate_billing()</code> in PR patch.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200">
              <div className="font-bold text-purple-900 mb-1">1. Direct Callers (Hop 1)</div>
              <p className="text-slate-600 font-sans leading-relaxed">
                Graph query finds <code className="font-mono bg-white px-1 rounded">checkout_api.py</code> and <code className="font-mono bg-white px-1 rounded">invoice_gen.py</code> directly invoke this function.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
              <div className="font-bold text-rose-900 mb-1">2. Transitive Callers (Hop 2)</div>
              <p className="text-slate-600 font-sans leading-relaxed">
                Graph traversal continues to find <code className="font-mono bg-white px-1 rounded">stripe_webhook.py</code> and <code className="font-mono bg-white px-1 rounded">billing_cron.py</code> are indirectly impacted.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-100">
            <span>Risk Calculation: Severity weighted by caller count &amp; test coverage</span>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">HIGH RISK: 4 Callers Impacted</span>
          </div>
        </div>
      </section>

      {/* Stage 5: Autonomous Review & Multi-Channel Delivery */}
      <section className="space-y-5 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 font-mono font-bold text-xs">
            05
          </div>
          <h2 id="step-5-ai-delivery" className="text-2xl font-serif font-bold text-[#111111]">
            5. Autonomous Review &amp; Multi-Channel Delivery
          </h2>
        </div>

        <p>
          Armed with the PR diff, the linked Jira requirement acceptance criteria, and the 2-hop blast radius impact list, the <strong>LiteLLM Review Orchestrator</strong> generates a deterministic, structured review.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 uppercase">
              <GitPullRequest className="w-4 h-4 text-emerald-600" />
              <span>Automated GitHub PR Comment</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Posts formatted inline diff comments pinpointing the exact line where a breaking change or requirement drift occurs. Updates the GitHub Check-Run status (Pass / Fail) automatically.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 uppercase">
              <Kanban className="w-4 h-4 text-sky-600" />
              <span>Bidirectional Jira Synchronization</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Converts complex Atlassian Document Format (ADF) trees, auto-posts impact summaries to the Jira ticket, and executes 1-click status transitions (e.g. <code className="font-mono bg-slate-100 px-1">In Review</code> &rarr; <code className="font-mono bg-slate-100 px-1">Done</code>).
            </p>
          </div>
        </div>

        <DocsCodeBlock
          language="json"
          filename="Deterministic Pydantic JSON Review Schema"
          code={`{
  "summary": "PR #42 modifies billing calculation parameters, introducing potential type mismatches.",
  "risk_score": 85,
  "risk_level": "HIGH",
  "requirement_compliance": {
    "jira_key": "PAY-104",
    "status": "DRIFT_DETECTED",
    "uncovered_criteria": ["Must support legacy EUR currency conversion fallback"]
  },
  "blast_radius": {
    "direct_callers": ["api/v1/checkout.py:process_payment"],
    "transitive_callers": ["workers/cron.py:reconcile_daily_charges"]
  },
  "actionable_recommendation": "Add default parameter fallback in calculate_billing to preserve backwards compatibility."
}`}
        />
      </section>

    </article>
  );
}
