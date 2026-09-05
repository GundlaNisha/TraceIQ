"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Zap, GitPullRequest, ShieldCheck, Users, Search, Network, Binary, Sparkles, Layers, FileCode2 } from "lucide-react";
import { RRFVisual } from "../architecture/RRFVisual";

export function CoreConceptsDoc() {
  return (
    <article className="space-y-12 max-w-5xl text-[15px] leading-relaxed text-[#222222]">
      
      {/* Title & Introduction */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
          Documentation // Core Concepts
        </div>
        <h1 id="core-concepts" className="text-3xl sm:text-5xl font-serif font-bold text-[#111111] tracking-tight">
          Core Concepts &amp; Intelligence Engines
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#555E6D] leading-relaxed">
          Deep dive into the structural parsing, mathematical fusion, graph algorithms, and autonomous review pipelines powering TraceIQ.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* 1. AST Parsing & Semantic Chunking */}
      <section className="space-y-4">
        <h2 id="ast-parsing" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
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

        <p className="text-xs sm:text-sm text-[#555E6D]">
          This breadcrumb ensures vector embeddings capture the structural role of the function (e.g. knowing that <code>validate_session</code> belongs to <code>TokenGuard</code> within <code>auth/guard.py</code>).
        </p>
      </section>

      {/* 2. Sub-15ms Hybrid Search (RRF) */}
      <section className="space-y-4 pt-2">
        <h2 id="hybrid-rrf-search" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          2. Sub-15ms Hybrid Search with Reciprocal Rank Fusion (RRF)
        </h2>
        <p>
          Pure vector search struggles with exact variable names and schema IDs, while full-text keyword search misses conceptual synonyms. TraceIQ evaluates three independent signals and fuses them via <strong>Reciprocal Rank Fusion</strong>:
        </p>

        {/* Custom Visual Component */}
        <RRFVisual />
      </section>

      {/* 3. 2-Hop Blast Radius */}
      <section className="space-y-4 pt-2">
        <h2 id="blast-radius-analysis" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          3. 2-Hop Graph Blast Radius Analysis
        </h2>
        <p>
          Given a product requirement, TraceIQ performs hybrid retrieval to find seed candidate functions, then walks the directed dependency graph (<code>code_dependencies</code>):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="font-mono text-xs font-bold text-rose-700">Seed Candidates</span>
            </div>
            <div className="font-serif font-bold text-sm text-[#111111]">Depth 0</div>
            <p className="text-xs text-[#555E6D]">
              Functions directly matching the requirement semantics retrieved via RRF fusion.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-mono text-xs font-bold text-amber-700">Direct Callers</span>
            </div>
            <div className="font-serif font-bold text-sm text-[#111111]">1-Hop Traversal</div>
            <p className="text-xs text-[#555E6D]">
              Upstream files and services that directly invoke the seed candidate methods.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1B2A4A]" />
              <span className="font-mono text-xs font-bold text-[#1B2A4A]">Transitive Blast Radius</span>
            </div>
            <div className="font-serif font-bold text-sm text-[#111111]">2-Hop Traversal</div>
            <p className="text-xs text-[#555E6D]">
              Second-degree caller chains and shared service contracts that might break transitively.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Automated PR Reviews */}
      <section className="space-y-4 pt-2">
        <h2 id="automated-pr-reviews" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          4. Autonomous Pull Request Review Engine
        </h2>
        <p>
          When a developer opens or updates a pull request, TraceIQ automatically reviews the diff chunks against the active requirement:
        </p>
        <ul className="space-y-2 text-sm text-[#333333]">
          <li>• <strong>AST Diff Chunking:</strong> Parses the unified diff into structured per-file patch chunks.</li>
          <li>• <strong>Requirement Compliance:</strong> Compares changed code against the requirement acceptance criteria.</li>
          <li>• <strong>Inline Comments:</strong> If an unaddressed requirement edge case is found, TraceIQ posts a structured review comment directly to the GitHub PR.</li>
        </ul>
      </section>

    </article>
  );
}
