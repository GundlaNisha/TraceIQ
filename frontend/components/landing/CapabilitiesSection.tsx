"use client";

import React, { useState } from "react";
import { 
  FileCode2, 
  Search, 
  GitPullRequest, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Zap,
  Kanban,
  ExternalLink
} from "lucide-react";

export function CapabilitiesSection() {
  const [astLang, setAstLang] = useState<"typescript" | "python" | "go" | "rust">("typescript");
  const [activeWorkspaceRole, setActiveWorkspaceRole] = useState<"owner" | "admin" | "member" | "viewer">("admin");

  return (
    <section id="capabilities" className="py-20 md:py-28 bg-[#F8F6F2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A] text-xs font-mono tracking-wider uppercase mb-3 border border-[#1B2A4A]/15">
            <span>Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight text-[#111111] leading-tight">
            Six architectural pillars. <br />
            <span className="text-[#1B2A4A]">Zero hallucinated reviews.</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#6B7280] font-sans leading-relaxed">
            Deterministic AST graph traversal, hybrid RRF retrieval, and native GitHub integrations — grounded in your actual code.
          </p>
        </div>

        {/* 6-Pillar Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ============================================================
              PILLAR 1: AST Code Graph Indexing (Span 7)
              ============================================================ */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#1B2A4A]/15 p-6 shadow-sm flex flex-col justify-between hover:border-[#1B2A4A]/30 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1B2A4A]/10 text-[#1B2A4A] flex items-center justify-center">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
                    Pillar 01 // AST Indexing
                  </span>
                </div>
                {/* Language Switcher */}
                <div className="flex items-center gap-1 bg-[#F8F6F2] p-1 rounded-lg border border-[#1B2A4A]/10 text-[11px] font-mono">
                  {(["typescript", "python", "go", "rust"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setAstLang(lang)}
                      className={`px-2 py-0.5 rounded capitalize transition-colors ${
                        astLang === lang
                          ? "bg-[#1B2A4A] text-white font-semibold shadow-2xs"
                          : "text-[#6B7280] hover:text-[#111111]"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#111111] mb-2">
                Multi-Language AST Parsing &amp; Semantic Chunking
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed mb-4">
                Preserves whole function and class declarations across Tree-sitter grammars with hierarchical context breadcrumbs injected into 384d Gemini embeddings.
              </p>
            </div>

            {/* Code Viewport */}
            <div className="rounded-xl bg-[#1B2A4A] p-3.5 text-slate-200 font-mono text-[11px] overflow-x-auto">
              <div className="text-emerald-400 font-semibold mb-1.5 truncate">
                // Context: src/auth/guard.{astLang === "python" ? "py" : astLang === "go" ? "go" : astLang === "rust" ? "rs" : "ts"} &gt; TokenGuard &gt; validate_session
              </div>
              <div className="space-y-0.5 text-slate-300">
                <div><span className="text-purple-400">export async function</span> <span className="text-yellow-300 font-bold">validate_session</span>(token: <span className="text-sky-300">string</span>) &#123;</div>
                <div className="pl-3">const payload = <span className="text-purple-400">await</span> <span className="text-sky-300">JWTDecoder</span>.<span className="text-yellow-300">verify</span>(token);</div>
                <div className="pl-3"><span className="text-purple-400">if</span> (!payload.valid) <span className="text-purple-400">throw new</span> <span className="text-rose-400">UnauthorizedError</span>();</div>
                <div className="pl-3"><span className="text-purple-400">return</span> <span className="text-sky-300">SessionStore</span>.<span className="text-yellow-300">touch</span>(payload.sub);</div>
                <div>&#125;</div>
              </div>
            </div>
          </div>

          {/* ============================================================
              PILLAR 2: Sub-15ms Hybrid RRF Search (Span 5)
              ============================================================ */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#1B2A4A]/15 p-6 shadow-sm flex flex-col justify-between hover:border-[#1B2A4A]/30 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
                    Pillar 02 // Hybrid RRF
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Latency: 11.2ms
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#111111] mb-2">
                Sub-15ms Reciprocal Rank Fusion
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed mb-3">
                Fuses pgvector cosine similarity, full-text tsvectors, and AST symbol tables to eliminate hallucinations.
              </p>
            </div>

            {/* Signal Convergence Cards */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-[#F8F6F2] border border-[#1B2A4A]/10 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#111111]">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Dense Vector (<code>pgvector</code>)
                </span>
                <span className="font-bold text-[#1B2A4A]">Rank #1</span>
              </div>
              <div className="p-2 rounded-lg bg-[#F8F6F2] border border-[#1B2A4A]/10 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#111111]">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  Full-Text Search (<code>tsvector</code>)
                </span>
                <span className="font-bold text-[#1B2A4A]">Rank #2</span>
              </div>
              <div className="p-2 rounded-lg bg-[#1B2A4A] text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  RRF Champion Candidate
                </span>
                <span className="font-bold text-emerald-400">Score: 0.0487</span>
              </div>
            </div>
          </div>

          {/* ============================================================
              PILLAR 3: 2-Hop Graph Blast Radius (Span 5)
              ============================================================ */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#1B2A4A]/15 p-6 shadow-sm flex flex-col justify-between hover:border-[#1B2A4A]/30 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
                    Pillar 03 // Blast Radius
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  Risk: HIGH (0.94)
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#111111] mb-2">
                2-Hop Impact Blast Radius Analysis
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed mb-3">
                Traverses direct callers and 2-hop downstream consumers before code is written, scoring risk and identifying missing test files.
              </p>
            </div>

            {/* Impact Chain */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="p-2 rounded-lg bg-rose-50/80 border border-rose-200 flex items-center justify-between text-rose-950">
                <span>app/modules/auth/guard.py</span>
                <span className="text-[10px] font-semibold text-rose-800">Seed (100%)</span>
              </div>
              <div className="ml-3 p-2 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center justify-between text-amber-950">
                <span>&lfloor; 1-Hop: app/db/session.py</span>
                <span className="text-[10px] font-semibold text-amber-800">Direct (92%)</span>
              </div>
              <div className="ml-6 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[#111111]">
                <span>&lfloor; 2-Hop: app/workers/sync.py</span>
                <span className="text-[10px] font-semibold text-[#6B7280]">Transitive (79%)</span>
              </div>
            </div>
          </div>

          {/* ============================================================
              PILLAR 4: Autonomous PR Review Engine (Span 7)
              ============================================================ */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#1B2A4A]/15 p-6 shadow-sm flex flex-col justify-between hover:border-[#1B2A4A]/30 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <GitPullRequest className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
                    Pillar 04 // PR Review
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  1 Gap Flagged
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#111111] mb-2">
                Automated PR Reviews &amp; GitHub Bot Comments
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed mb-3">
                Evaluates patch chunks against requirement criteria and posts line-level suggestions and severity summaries straight to GitHub.
              </p>
            </div>

            {/* Bot Review Mockup */}
            <div className="p-3.5 rounded-xl bg-[#F8F6F2] border border-[#1B2A4A]/15 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-[#111111]">
                  <div className="w-5 h-5 rounded bg-[#1B2A4A] text-white flex items-center justify-center text-[9px] font-bold">
                    TIQ
                  </div>
                  <span>traceiq-bot</span>
                  <span className="text-[10px] text-[#6B7280] font-normal">commented via GitHub Webhook</span>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-[#111111] leading-relaxed">
                <strong>Requirement Gap:</strong> REQ-84 requires session invalidation on refresh token rotation.
              </p>
              <div className="font-mono text-[11px] text-[#6B7280] bg-white p-2 rounded border border-[#1B2A4A]/10">
                Fix: Add <code>await session_store.revoke(user_id)</code> on line 18.
              </div>
            </div>
          </div>

          {/* ============================================================
              PILLAR 5: Traceability Matrix (Span 6)
              ============================================================ */}
          <div className="lg:col-span-6 rounded-2xl bg-white border border-[#1B2A4A]/15 p-6 shadow-sm flex flex-col justify-between hover:border-[#1B2A4A]/30 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
                    Pillar 05 // Traceability
                  </span>
                </div>
                <span className="text-xs font-serif font-bold text-emerald-700">96.4% Health</span>
              </div>

              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#111111] mb-2">
                Continuous Traceability Matrix
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed mb-3">
                Connects product specs, predicted impact zones, and PR review verdicts into an audit-ready compliance matrix.
              </p>
            </div>

            {/* Matrix Table Snippet */}
            <div className="border border-[#1B2A4A]/10 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F8F6F2] text-[10px] font-mono text-[#6B7280] uppercase">
                  <tr>
                    <th className="px-3 py-2">Requirement</th>
                    <th className="px-3 py-2">PR Review</th>
                    <th className="px-3 py-2">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2A4A]/10 text-[11px]">
                  <tr>
                    <td className="px-3 py-2 font-medium">REQ-84: Token Rotation</td>
                    <td className="px-3 py-2 text-emerald-700 font-semibold font-mono">PR #142</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">REQ-91: Workspace RBAC</td>
                    <td className="px-3 py-2 text-emerald-700 font-semibold font-mono">PR #139</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================
              PILLAR 6: Workspaces & Jira REST API Integration (Span 6)
              ============================================================ */}
          <div className="lg:col-span-6 rounded-2xl bg-white border border-[#1B2A4A]/15 p-6 shadow-sm flex flex-col justify-between hover:border-[#1B2A4A]/30 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1B2A4A] uppercase tracking-wider">
                    Pillar 06 // Workspaces &amp; Jira
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Kanban className="w-3 h-3" /> Jira Sync
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#111111] mb-2">
                Team Workspaces &amp; Jira Kanban Import
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed mb-3">
                Multi-tenant RBAC with 1-click tokenized invites, repository transfers, and direct Jira REST API import for Kanban boards and Sprints.
              </p>
            </div>

            {/* Role & Jira Quick Badge */}
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-4 gap-1.5">
                {(["owner", "admin", "member", "viewer"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setActiveWorkspaceRole(role)}
                    className={`py-1 text-[11px] font-mono uppercase font-semibold rounded-md border transition-all ${
                      activeWorkspaceRole === role
                        ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
                        : "bg-[#F8F6F2] text-[#6B7280] border-[#1B2A4A]/10"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <div className="p-2 rounded-lg bg-[#F8F6F2] border border-[#1B2A4A]/10 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6B7280]">Role Access ({activeWorkspaceRole}):</span>
                <span className="font-bold text-emerald-700">
                  {activeWorkspaceRole === "viewer" ? "Read-Only Viewer" : "Full Review & Sync"}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
