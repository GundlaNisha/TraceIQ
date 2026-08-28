"use client";

import React, { useState } from "react";
import { 
  GitBranch, 
  Search, 
  Layers, 
  ShieldCheck, 
  FileCode2, 
  GitPullRequest, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  Users, 
  Lock, 
  ChevronRight,
  Database,
  ArrowRight,
  TrendingUp,
  Activity
} from "lucide-react";

export function CapabilitiesSection() {
  // State for interactive widgets
  const [astLang, setAstLang] = useState<"python" | "typescript" | "go" | "rust">("typescript");
  const [activeTabRRF, setActiveTabRRF] = useState<"formula" | "signals">("signals");
  const [activeWorkspaceRole, setActiveWorkspaceRole] = useState<"owner" | "admin" | "member" | "viewer">("admin");

  return (
    <section id="capabilities" className="py-24 md:py-32 bg-[#F8F6F2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A] text-xs font-mono tracking-wider uppercase mb-4 border border-[#1B2A4A]/15">
            <span>Enterprise Code Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-serif tracking-tight text-[#111111] leading-tight">
            Six architectural pillars. <br />
            <span className="text-[#1B2A4A]">Zero hallucinated reviews.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6B7280] font-sans leading-relaxed">
            Every capability in TraceIQ is grounded in structural AST parsing, deterministic graph traversal, and native GitHub integrations — not ungrounded LLM guesswork.
          </p>
        </div>

        {/* ============================================================
            FEATURE 1: AST Code Graph Indexing (Spotlight Left / Visual Right)
            ============================================================ */}
        <div className="mb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              <span className="w-6 h-px bg-[#1B2A4A]" />
              <span>Pillar 01 // Code Intelligence</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#111111] leading-snug">
              Multi-Language AST Parsing & Semantic Chunking
            </h3>
            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">
              TraceIQ extracts deep symbol hierarchies across Python, TypeScript, Go, Rust, Java/Kotlin, and C/C++ using Tree-sitter. Rather than slicing arbitrary token windows, it preserves intact class and function declarations, injecting hierarchical context breadcrumbs directly into vector embeddings.
            </p>
            <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#111111] font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hierarchical context breadcrumb injection (<code>// Context: path &gt; Class &gt; method</code>)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>384-dimensional dense embeddings via Google Gemini (0 MB server RAM)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>High-throughput bulk SQL transactions indexing codebases in seconds</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7">
            {/* AST Visual Widget */}
            <div className="rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-xs">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-[#1B2A4A]" />
                  <span className="font-mono font-semibold text-[#1B2A4A]">Tree-Sitter Syntax Inspector</span>
                </div>
                {/* Language Switcher */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-[#1B2A4A]/10 text-[11px] font-mono">
                  {(["typescript", "python", "go", "rust"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setAstLang(lang)}
                      className={`px-2 py-0.5 rounded capitalize transition-colors ${
                        astLang === lang
                          ? "bg-[#1B2A4A] text-white font-semibold"
                          : "text-[#6B7280] hover:text-[#111111]"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Chunk Viewport */}
              <div className="p-4 bg-[#1B2A4A] text-slate-200 font-mono text-xs overflow-x-auto">
                <div className="text-emerald-400 font-semibold mb-2">
                  // Context: src/auth/guard.{astLang === "python" ? "py" : astLang === "go" ? "go" : astLang === "rust" ? "rs" : "ts"} &gt; TokenGuard &gt; validate_session
                </div>
                <div className="space-y-1 text-slate-300">
                  <div><span className="text-purple-400">export async function</span> <span className="text-yellow-300 font-bold">validate_session</span>(token: <span className="text-sky-300">string</span>) &#123;</div>
                  <div className="pl-4"><span className="text-slate-400">// Extracted AST Node: CallExpression</span></div>
                  <div className="pl-4">const payload = <span className="text-purple-400">await</span> <span className="text-sky-300">JWTDecoder</span>.<span className="text-yellow-300">verify</span>(token);</div>
                  <div className="pl-4"><span className="text-purple-400">if</span> (!payload.valid) <span className="text-purple-400">throw new</span> <span className="text-rose-400">UnauthorizedError</span>();</div>
                  <div className="pl-4"><span className="text-purple-400">return</span> <span className="text-sky-300">SessionStore</span>.<span className="text-yellow-300">touch</span>(payload.sub);</div>
                  <div>&#125;</div>
                </div>
              </div>

              {/* Parsed Symbols & Vector Meta */}
              <div className="p-4 bg-white border-t border-[#1B2A4A]/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[#F8F6F2] border border-[#1B2A4A]/10">
                  <div className="text-[10px] font-mono text-[#6B7280] uppercase">AST Node Type</div>
                  <div className="font-mono font-semibold text-[#1B2A4A] mt-0.5">FunctionDeclaration</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F8F6F2] border border-[#1B2A4A]/10">
                  <div className="text-[10px] font-mono text-[#6B7280] uppercase">Symbol Children</div>
                  <div className="font-mono font-semibold text-[#1B2A4A] mt-0.5">3 Calls, 2 Imports</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] font-mono text-emerald-700 uppercase">Vector Embedding</div>
                  <div className="font-mono font-semibold text-emerald-900 mt-0.5">384d Matryoshka</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            FEATURE 2: Sub-15ms Hybrid RRF Search (Visual Left / Spotlight Right)
            ============================================================ */}
        <div className="mb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Visual Left */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#1B2A4A]" />
                  <span className="font-mono text-xs font-semibold text-[#1B2A4A]">RRF Multi-Signal Retrieval Engine</span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Latency: 11.2ms
                </span>
              </div>

              {/* Simulated Query Bar */}
              <div className="p-4 border-b border-[#1B2A4A]/10 bg-white">
                <div className="text-[11px] font-mono text-[#6B7280] mb-1">Search Input Vector &amp; Text:</div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8F6F2] border border-[#1B2A4A]/15 text-xs font-mono font-semibold text-[#111111]">
                  <span>&quot;revoke active session token on blacklist expiration&quot;</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#1B2A4A]" />
                </div>
              </div>

              {/* 3-Signal Score Convergence */}
              <div className="p-4 space-y-3 bg-[#F8F6F2]/50">
                {/* Signal 1: Dense Vector */}
                <div className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-[#111111] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>Dense Vector Semantic Distance (<code>pgvector</code>)</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-mono mt-0.5">Cosine distance: 0.942 • Rank #1</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1B2A4A]">Score: 0.0163</span>
                </div>

                {/* Signal 2: Full-Text */}
                <div className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-[#111111] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      <span>Full-Text Substring Matching (<code>tsvector</code>)</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-mono mt-0.5">Pattern search: exact keyword match • Rank #2</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1B2A4A]">Score: 0.0161</span>
                </div>

                {/* Signal 3: AST Symbols */}
                <div className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-[#111111] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>AST Symbol Table Lookup (<code>code_symbols</code>)</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] font-mono mt-0.5">Direct symbol reference match • Rank #1</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-700">Score: 0.0163</span>
                </div>

                {/* Unified Result */}
                <div className="p-3 rounded-lg bg-[#1B2A4A] text-white flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-mono font-bold text-emerald-400 uppercase text-[10px]">RRF Unified Champion Candidate:</span>
                    <div className="font-mono font-semibold mt-0.5">backend/app/db/session.py :: revoke_token()</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-emerald-400">RRF: 0.0487</span>
                    <div className="text-[10px] text-slate-300 font-mono">Deduplicated</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spotlight Right */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              <span className="w-6 h-px bg-[#1B2A4A]" />
              <span>Pillar 02 // Retrieval Fusion</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#111111] leading-snug">
              Sub-15ms Hybrid Code Search via Reciprocal Rank Fusion
            </h3>
            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">
              Pure vector search frequently hallucinates variable names, while full-text search misses conceptual architecture. TraceIQ calculates Reciprocal Rank Fusion (RRF) over three discrete signals — vector embeddings, PostgreSQL tsvectors, and AST symbol tables — producing razor-sharp retrieval candidates in under 15 milliseconds.
            </p>
            <div className="p-3 rounded-xl bg-white border border-[#1B2A4A]/10 text-xs font-mono text-[#1B2A4A]">
              <strong>RRF Fusion Formula:</strong> <br />
              <span className="text-[#6B7280]">RRF_Score(d) = &sum; 1 / (60 + r_signal(d))</span>
            </div>
          </div>
        </div>

        {/* ============================================================
            FEATURE 3: Graph-Augmented 2-Hop Blast Radius Analysis (Left Spotlight / Right Visual)
            ============================================================ */}
        <div className="mb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              <span className="w-6 h-px bg-[#1B2A4A]" />
              <span>Pillar 03 // Blast Radius</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#111111] leading-snug">
              Graph-Augmented 2-Hop Impact Blast Radius
            </h3>
            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">
              Before a single line of code is committed, engineers can run proposed requirements against the code graph. TraceIQ traverses 1-hop direct callers and 2-hop downstream consumers, scoring architectural risk and identifying required test files.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10">
                <span className="text-xs font-serif font-bold text-[#111111]">Deterministic Risk</span>
                <p className="text-[11px] text-[#6B7280] mt-1">Classifies changes into High, Medium, or Low architectural risk.</p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10">
                <span className="text-xs font-serif font-bold text-[#111111]">Missing Test Radar</span>
                <p className="text-[11px] text-[#6B7280] mt-1">Cross-references mapped dependencies with test suites.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {/* Blast Radius Visual Card */}
            <div className="rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-[#1B2A4A]">Blast Radius Traversal Matrix</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  Risk Level: HIGH (0.94)
                </span>
              </div>

              {/* Impact Hierarchy List */}
              <div className="p-4 space-y-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-semibold text-rose-950">app/modules/auth/guard.py</span>
                  </div>
                  <span className="text-[11px] text-rose-800 font-semibold">Seed Candidate (100%)</span>
                </div>

                <div className="ml-4 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-semibold text-amber-950">&lfloor; 1-Hop: app/db/session.py</span>
                  </div>
                  <span className="text-[11px] text-amber-800 font-semibold">Direct Caller (92%)</span>
                </div>

                <div className="ml-8 p-2.5 rounded-lg bg-slate-50 border border-[#1B2A4A]/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1B2A4A]" />
                    <span className="font-semibold text-[#111111]">&lfloor; 2-Hop: app/modules/billing/meter.py</span>
                  </div>
                  <span className="text-[11px] text-[#6B7280] font-semibold">Transitive Consumer (84%)</span>
                </div>

                <div className="ml-8 p-2.5 rounded-lg bg-slate-50 border border-[#1B2A4A]/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1B2A4A]" />
                    <span className="font-semibold text-[#111111]">&lfloor; 2-Hop: app/workers/sync.py</span>
                  </div>
                  <span className="text-[11px] text-[#6B7280] font-semibold">Transitive Consumer (79%)</span>
                </div>
              </div>

              <div className="px-4 py-3 bg-[#F8F6F2] border-t border-[#1B2A4A]/10 flex items-center justify-between text-xs text-[#6B7280]">
                <span>Total Nodes Traversed: <strong>14 AST entities</strong></span>
                <span className="text-emerald-700 font-semibold">Requirement Grounding: Complete</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            FEATURE 4: Automated PR Review Engine (Visual Left / Spotlight Right)
            ============================================================ */}
        <div className="mb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 order-2 lg:order-1">
            {/* PR Review Mockup */}
            <div className="rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-[#1B2A4A]" />
                  <span className="font-semibold text-[#111111]">PR #142: feat(auth): add dual-token rotation</span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Findings: 1 Requirement Gap
                </span>
              </div>

              {/* Side-by-side diff chunk snippet */}
              <div className="p-3 bg-[#111111] text-slate-200 font-mono text-xs overflow-x-auto">
                <div className="text-slate-400 text-[10px] mb-1">@@ -14,5 +14,7 @@ class TokenService:</div>
                <div className="text-rose-400 bg-rose-950/40 px-1">-  def verify_token(self, token: str) -&gt; bool:</div>
                <div className="text-emerald-400 bg-emerald-950/40 px-1">+  def verify_token(self, token: str, refresh_token: str) -&gt; TokenPair:</div>
                <div className="text-emerald-400 bg-emerald-950/40 px-1">+      self.blacklist.check(token)</div>
              </div>

              {/* GitHub Native Bot Review Comment */}
              <div className="p-4 bg-white border-t border-[#1B2A4A]/10">
                <div className="p-3.5 rounded-xl bg-[#F8F6F2] border border-[#1B2A4A]/15 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#1B2A4A] flex items-center justify-center text-white text-[10px] font-bold">
                        TIQ
                      </div>
                      <span className="font-semibold text-[#111111]">traceiq-bot</span>
                      <span className="text-[10px] text-[#6B7280]">commented via Webhook</span>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                      ACTION REQUIRED
                    </span>
                  </div>

                  <p className="text-xs text-[#111111] leading-relaxed">
                    <strong>⚠️ Requirement Gap Detected:</strong> REQ-84 specifies that invalid refresh tokens must trigger immediate session revocation in <code>SessionStore</code>. The patch modifies the signature but does not emit the revocation event.
                  </p>

                  <div className="text-[11px] font-mono text-[#6B7280] bg-white p-2 rounded border border-[#1B2A4A]/10">
                    Suggested fix: Add <code>await session_store.revoke(user_id)</code> on line 18.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              <span className="w-6 h-px bg-[#1B2A4A]" />
              <span>Pillar 04 // Autonomous Review</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#111111] leading-snug">
              Automated PR Review Engine & GitHub Native Comments
            </h3>
            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">
              When a developer pushes commits, TraceIQ intercepts the GitHub webhook, parses unified diffs into structured patch chunks, and evaluates the code against active product criteria. It posts structured summaries, severity badges, and line-level code suggestions straight to GitHub.
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-[#111111] font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Autonomous webhook reviews triggered on PR open &amp; push</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Line-level GitHub comments with contextual code fixes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>On-demand review rerun with custom requirement benchmarks</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ============================================================
            FEATURE 5: Traceability Matrix & Compliance (Spotlight Left / Visual Right)
            ============================================================ */}
        <div className="mb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              <span className="w-6 h-px bg-[#1B2A4A]" />
              <span>Pillar 05 // Compliance Audit</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#111111] leading-snug">
              End-to-End Traceability Matrix & Health Scoring
            </h3>
            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">
              TraceIQ aggregates product requirements, predicted blast radiuses, and PR review verdicts into a continuous compliance matrix. Automatically calculates repository-level compliance health based on test coverage and unresolved critical findings.
            </p>
            <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/10 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-[#6B7280]">Repository Compliance Health</span>
                <div className="text-2xl font-serif font-bold text-[#1B2A4A]">96.4% Passed</div>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">
                AUDIT READY
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {/* Matrix Table Visual */}
            <div className="rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-[#1B2A4A]">Audit Traceability Matrix</span>
                <span className="text-[11px] font-mono text-[#6B7280]">Workspace: core-engineering</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#F8F6F2]/70 border-b border-[#1B2A4A]/10 text-[10px] font-mono text-[#6B7280] uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Requirement</th>
                      <th className="px-3 py-2.5">Blast Radius</th>
                      <th className="px-3 py-2.5">PR Review</th>
                      <th className="px-4 py-2.5">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B2A4A]/10">
                    <tr>
                      <td className="px-4 py-3 font-medium text-[#111111]">REQ-84: Token Rotation</td>
                      <td className="px-3 py-3 font-mono text-[#6B7280]">6 files (High)</td>
                      <td className="px-3 py-3 font-mono text-emerald-700 font-semibold">PR #142 (Approved)</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[#111111]">REQ-91: Workspace RBAC</td>
                      <td className="px-3 py-3 font-mono text-[#6B7280]">4 files (Medium)</td>
                      <td className="px-3 py-3 font-mono text-emerald-700 font-semibold">PR #139 (Approved)</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-[#111111]">REQ-103: Stripe Invoicing</td>
                      <td className="px-3 py-3 font-mono text-[#6B7280]">8 files (High)</td>
                      <td className="px-3 py-3 font-mono text-amber-700 font-semibold">PR #145 (1 Gap)</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                          <AlertCircle className="w-3 h-3" /> PENDING GAP
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            FEATURE 6: Multi-Tenant Workspaces & RBAC (Visual Left / Spotlight Right)
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            {/* RBAC & Workspace Visual */}
            <div className="rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1B2A4A]" />
                  <span className="font-mono font-semibold text-[#1B2A4A]">Multi-Tenant Workspaces &amp; RBAC</span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#1B2A4A]/10 text-[#1B2A4A]">
                  Header: X-Workspace-Id
                </span>
              </div>

              {/* Role Matrix Selector */}
              <div className="p-4 bg-white border-b border-[#1B2A4A]/10">
                <div className="text-[11px] font-mono text-[#6B7280] mb-2">Select Active Role:</div>
                <div className="grid grid-cols-4 gap-2">
                  {(["owner", "admin", "member", "viewer"] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => setActiveWorkspaceRole(role)}
                      className={`py-1.5 text-xs font-mono uppercase font-semibold rounded-md border transition-all ${
                        activeWorkspaceRole === role
                          ? "bg-[#1B2A4A] text-white border-[#1B2A4A] shadow-xs"
                          : "bg-[#F8F6F2] text-[#6B7280] border-[#1B2A4A]/10 hover:text-[#111111]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Capabilities for Selected Role */}
              <div className="p-4 bg-[#F8F6F2]/40 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-white border border-[#1B2A4A]/10">
                  <span className="text-[#111111]">AST Indexing &amp; Repo Transfer</span>
                  <span className={`font-mono text-[11px] font-bold ${activeWorkspaceRole === "viewer" ? "text-rose-600" : "text-emerald-700"}`}>
                    {activeWorkspaceRole === "viewer" ? "RESTRICTED" : "ALLOWED"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white border border-[#1B2A4A]/10">
                  <span className="text-[#111111]">Trigger Automated PR Reruns</span>
                  <span className={`font-mono text-[11px] font-bold ${activeWorkspaceRole === "viewer" ? "text-rose-600" : "text-emerald-700"}`}>
                    {activeWorkspaceRole === "viewer" ? "RESTRICTED" : "ALLOWED"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white border border-[#1B2A4A]/10">
                  <span className="text-[#111111]">Generate Expiring Team Invites (<code>/join/[token]</code>)</span>
                  <span className={`font-mono text-[11px] font-bold ${activeWorkspaceRole === "owner" || activeWorkspaceRole === "admin" ? "text-emerald-700" : "text-rose-600"}`}>
                    {activeWorkspaceRole === "owner" || activeWorkspaceRole === "admin" ? "ALLOWED" : "RESTRICTED"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
              <span className="w-6 h-px bg-[#1B2A4A]" />
              <span>Pillar 06 // Multi-Tenancy</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-[#111111] leading-snug">
              Personal &amp; Team Workspaces with Scoped Intelligence
            </h3>
            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed">
              Every user receives a private Personal Workspace alongside the ability to manage collaborative Team Workspaces. All indexed code graphs, PR reviews, and compliance records are cryptographically isolated and scoped by active workspace header.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs font-mono text-[#1B2A4A]">
              <span className="px-2.5 py-1 bg-white rounded border border-[#1B2A4A]/15 font-semibold">
                1-Click Invite Links
              </span>
              <span className="px-2.5 py-1 bg-white rounded border border-[#1B2A4A]/15 font-semibold">
                Repo Transfer Engine
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
