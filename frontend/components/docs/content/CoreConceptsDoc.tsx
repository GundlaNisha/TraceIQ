"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Zap, GitPullRequest, ShieldCheck, Users, Search, Network } from "lucide-react";

export function CoreConceptsDoc() {
  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // Core Concepts
        </div>
        <h1 id="core-concepts" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          Core Concepts &amp; Intelligence Engines
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          Deep dive into the structural parsing, mathematical fusion, graph algorithms, and autonomous review pipelines powering TraceIQ.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* 1. AST Parsing & Semantic Chunking */}
      <section className="space-y-4">
        <h2 id="ast-parsing" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          1. AST Parsing &amp; Hierarchical Context Breadcrumbs
        </h2>
        <p>
          Unlike naive chunkers that slice text at arbitrary token limits, TraceIQ uses Tree-sitter grammars to parse whole function declarations, classes, and structs as intact units.
        </p>
        <p>
          To ensure vector search understands where a function lives in the wider codebase, TraceIQ injects a <strong>hierarchical context breadcrumb</strong> into the chunk header prior to vector embedding:
        </p>
        
        <DocsCodeBlock
          code={`// Context Breadcrumb Injection Format:
// Context: <file_path> > <ClassName> > <function_name>

// Context: app/modules/auth/guard.py > TokenGuard > validate_session
async def validate_session(token: str) -> Session:
    payload = await jwt_decoder.verify(token)
    if not payload.valid:
        raise UnauthorizedError()
    return await session_store.touch(payload.sub)`}
          language="python"
          filename="Context Injected Code Chunk"
        />

        <p className="text-xs text-[#6B7280]">
          This breadcrumb ensures vector embeddings capture the structural role of the function (e.g. knowing that <code>validate_session</code> belongs to <code>TokenGuard</code> within <code>auth/guard.py</code>).
        </p>
      </section>

      {/* 2. Sub-15ms Hybrid Search (RRF) */}
      <section className="space-y-4 pt-4">
        <h2 id="hybrid-rrf-search" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          2. Sub-15ms Hybrid Search with Reciprocal Rank Fusion (RRF)
        </h2>
        <p>
          Pure vector search struggles with exact variable names and schema IDs, while full-text keyword search misses conceptual synonyms. TraceIQ evaluates three independent signals and fuses them via <strong>Reciprocal Rank Fusion</strong>:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10">
            <span className="font-bold text-blue-600">Signal 1: pgvector</span>
            <p className="text-[11px] text-[#6B7280] font-sans mt-1">Cosine distance over 384d Gemini dense embeddings.</p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10">
            <span className="font-bold text-purple-600">Signal 2: tsvector</span>
            <p className="text-[11px] text-[#6B7280] font-sans mt-1">PostgreSQL full-text English dictionary pattern search.</p>
          </div>
          <div className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10">
            <span className="font-bold text-emerald-600">Signal 3: Symbols</span>
            <p className="text-[11px] text-[#6B7280] font-sans mt-1">Direct AST symbol table index (<code>code_symbols</code>).</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-2">
          <h4 className="font-serif font-bold text-sm text-[#111111]">The RRF Fusion Formula</h4>
          <DocsCodeBlock
            code="RRF_Score(d) = Σ ( w_signal / ( k + rank_signal(d) ) )

Where:
- k = 60 (standard smoothing constant)
- rank_signal(d) = 1-based rank of document in that signal's result list
- w_vector = 1.0, w_text = 0.8, w_symbol = 1.2"
            language="text"
            filename="RRF Ranking Formula"
          />
        </div>
      </section>

      {/* 3. 2-Hop Blast Radius */}
      <section className="space-y-4 pt-4">
        <h2 id="blast-radius-analysis" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          3. 2-Hop Graph Blast Radius Analysis
        </h2>
        <p>
          Given a product requirement, TraceIQ performs hybrid retrieval to find seed candidate functions, then walks the directed dependency graph (<code>code_dependencies</code>):
        </p>

        <ul className="space-y-2 text-xs">
          <li className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <div>
              <strong>Seed Candidates (Depth 0):</strong> Functions directly relevant to the requirement text.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div>
              <strong>Direct Callers (1-Hop):</strong> Upstream files and modules that directly call the seed functions.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1B2A4A] mt-1.5 shrink-0" />
            <div>
              <strong>Transitive Consumers (2-Hop):</strong> Downstream services, background workers, and API controllers calling the direct callers.
            </div>
          </li>
        </ul>

        <DocsCallout type="important" title="Deterministic Risk Scoring">
          Risk scores are computed based on the ratio of impacted downstream modules, whether auth/payment critical paths are touched, and whether corresponding test files exist in the repository.
        </DocsCallout>
      </section>

      {/* 4. Automated PR Reviews */}
      <section className="space-y-4 pt-4">
        <h2 id="automated-pr-reviews" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          4. Automated PR Review Engine
        </h2>
        <p>
          When a developer opens or updates a Pull Request on GitHub:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#111111]">
          <li>GitHub fires a <code className="font-mono bg-slate-100 px-1">pull_request.opened</code> or <code className="font-mono bg-slate-100 px-1">pull_request.synchronize</code> webhook.</li>
          <li>TraceIQ parses the unified diff into structured per-file patch chunks.</li>
          <li>The AI evaluator compares modified AST nodes against the stated requirement blast radius.</li>
          <li>If an unaddressed requirement edge case is found, TraceIQ posts a structured review comment directly to the GitHub PR.</li>
        </ol>
      </section>

      {/* 5. Workspaces & RBAC */}
      <section className="space-y-4 pt-4">
        <h2 id="workspaces-and-rbac" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          5. Multi-Tenant Workspaces &amp; RBAC Matrix
        </h2>
        <div className="overflow-x-auto border border-[#1B2A4A]/10 rounded-xl bg-white">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-[#6B7280] uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">Permission</th>
                <th className="px-3 py-2.5 text-center">Owner</th>
                <th className="px-3 py-2.5 text-center">Admin</th>
                <th className="px-3 py-2.5 text-center">Member</th>
                <th className="px-3 py-2.5 text-center">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]/10">
              <tr>
                <td className="px-4 py-2.5 font-sans">View Repositories, PRs &amp; Matrix</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans">Create Requirements &amp; Run Analysis</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans">Trigger PR Reruns &amp; Indexing</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans">Generate Invite Links (<code>/join/[token]</code>)</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗</td>
                <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-sans">Workspace Settings &amp; Repo Transfer</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗</td>
                <td className="px-3 py-2.5 text-center text-rose-500 font-bold">✗</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </article>
  );
}
