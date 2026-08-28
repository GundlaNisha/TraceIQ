"use client";

import React from "react";
import { AlertTriangle, GitPullRequestDraft, TableProperties, ArrowDownRight } from "lucide-react";

export function ProblemSection() {
  const problems = [
    {
      id: "01",
      tag: "THE 2-HOP BLINDSPOT",
      title: "Diff tools only show what changed — not what will break.",
      narrative:
        "Standard pull request diffs isolate line changes in a vacuum. When an engineer alters a session validation helper or enum schema, reviewers cannot mentally map the 2-hop downstream callers across microservices. Unchecked transitive dependencies cause 70%+ of distributed regressions.",
      stat: "73%",
      statLabel: "of production bugs stem from unmapped transitive callers",
    },
    {
      id: "02",
      tag: "REQUIREMENT DRIFT",
      title: "Accepted PRs silently diverge from product specifications.",
      narrative:
        "Requirements live in Jira or Notion, while code evolves across multi-commit review rounds. Without automated AST verification, subtle edge cases, auth guards, and negative test assertions get quietly dropped during rapid iteration, turning technical debt into compliance violations.",
      stat: "4.2x",
      statLabel: "more time spent diagnosing requirement mismatches post-merge",
    },
    {
      id: "03",
      tag: "STALE COMPLIANCE MATRICES",
      title: "Audit readiness is chained to manual spreadsheets.",
      narrative:
        "Engineering leadership is forced to reconstruct traceability by hand — matching commit hashes to feature flags and audit criteria. The moment code is refactored, static documentation rots, exposing enterprise teams to audit findings and security blind spots.",
      stat: "0%",
      statLabel: "real-time verification with static documentation tables",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[#1B2A4A] text-[#F8F6F2] relative overflow-hidden">
      {/* Background Noise and Grid Accent */}
      <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-mono tracking-wider uppercase mb-4 border border-white/10">
            <span>Architecture & Review Dilemma</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-bold font-serif tracking-tight leading-tight text-white">
            Code reviews are failing because git diffs lack{" "}
            <span className="italic text-emerald-400">architectural context</span>.
          </h2>
          
          <p className="mt-4 text-base sm:text-lg text-slate-300 font-sans leading-relaxed">
            Modern software engineering has scaled in complexity, but our primary quality gate — the line-by-line PR diff — has remained unchanged for twenty years.
          </p>
        </div>

        {/* Narrative Comparison Strip (Editorial Layout, not uniform cards) */}
        <div className="space-y-12 divide-y divide-white/10">
          {problems.map((item, idx) => (
            <div
              key={item.id}
              className={`pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-all hover:bg-white/[0.02] p-4 rounded-xl`}
            >
              {/* Left Column: Number & Category Tag */}
              <div className="lg:col-span-3 flex flex-col">
                <span className="font-mono text-3xl sm:text-4xl font-bold text-white/30 tracking-tighter">
                  {item.id}
                </span>
                <span className="mt-2 font-mono text-xs font-semibold text-emerald-400 tracking-wider">
                  {item.tag}
                </span>
              </div>

              {/* Middle Column: Core Narrative */}
              <div className="lg:col-span-6 space-y-3">
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
                  {item.narrative}
                </p>
              </div>

              {/* Right Column: Key Metric Callout */}
              <div className="lg:col-span-3 flex flex-col items-start lg:items-end justify-center p-4 rounded-lg bg-white/5 border border-white/10">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-white">
                  {item.stat}
                </span>
                <span className="text-xs text-slate-300 font-sans mt-1 text-left lg:text-right">
                  {item.statLabel}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bridge Statement to Capabilities */}
        <div className="mt-16 pt-10 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-sm sm:text-base text-slate-300 max-w-2xl">
            <strong className="text-white">The TraceIQ Solution:</strong> Map the AST graph continuously, fuse semantic and lexical code signals in sub-15ms, and evaluate pull requests against real requirement blast radiuses.
          </div>
          <a
            href="#capabilities"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#1B2A4A] font-semibold text-xs hover:bg-slate-100 transition-colors shadow-xs shrink-0"
          >
            <span>Explore Core Capabilities</span>
            <ArrowDownRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
}
