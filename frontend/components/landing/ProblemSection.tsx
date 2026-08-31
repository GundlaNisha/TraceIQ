"use client";

import React from "react";
import { ArrowDownRight } from "lucide-react";

export function ProblemSection() {
  const problems = [
    {
      id: "01",
      tag: "THE 2-HOP BLINDSPOT",
      title: "Diff tools only show what changed — not what will break.",
      narrative:
        "Standard pull request diffs isolate line changes in a vacuum. Modifying a shared utility or enum schema secretly breaks unmapped 2-hop downstream callers.",
      stat: "73%",
      statLabel: "of production regressions come from transitive dependencies",
    },
    {
      id: "02",
      tag: "REQUIREMENT DRIFT",
      title: "Accepted PRs silently diverge from product specs.",
      narrative:
        "Requirements live in Jira or Notion while code evolves across review cycles. Without AST verification, critical edge cases and security guards get quietly dropped.",
      stat: "4.2x",
      statLabel: "more time spent diagnosing requirement mismatches post-merge",
    },
    {
      id: "03",
      tag: "STALE TRACEABILITY",
      title: "Audit readiness is chained to manual spreadsheets.",
      narrative:
        "Engineers manually reconstruct audit trails by matching commit hashes to feature flags. The moment code is refactored, static documentation rots.",
      stat: "0%",
      statLabel: "real-time verification with static documentation tables",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#1B2A4A] text-[#F8F6F2] relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-mono tracking-wider uppercase mb-3 border border-white/10">
            <span>The Review Dilemma</span>
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight leading-tight text-white">
            Code reviews fail because git diffs lack{" "}
            <span className="italic text-emerald-400">architectural context</span>.
          </h2>
        </div>

        {/* Comparison List */}
        <div className="space-y-6 divide-y divide-white/10">
          {problems.map((item) => (
            <div
              key={item.id}
              className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center hover:bg-white/[0.02] p-3.5 rounded-xl transition-all"
            >
              {/* Left Column: Number & Tag */}
              <div className="lg:col-span-3 flex flex-row lg:flex-col items-center lg:items-start gap-3 lg:gap-1">
                <span className="font-mono text-2xl sm:text-3xl font-bold text-white/30 tracking-tighter">
                  {item.id}
                </span>
                <span className="font-mono text-[11px] font-semibold text-emerald-400 tracking-wider">
                  {item.tag}
                </span>
              </div>

              {/* Middle Column: Narrative */}
              <div className="lg:col-span-6 space-y-1.5">
                <h3 className="text-lg sm:text-xl font-serif font-bold text-white leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                  {item.narrative}
                </p>
              </div>

              {/* Right Column: Key Metric */}
              <div className="lg:col-span-3 flex flex-col items-start lg:items-end justify-center p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  {item.stat}
                </span>
                <span className="text-[11px] text-slate-300 font-sans mt-0.5 text-left lg:text-right">
                  {item.statLabel}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bridge to Capabilities */}
        <div className="mt-12 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            <strong className="text-white">The Solution:</strong> Continuous AST indexing, sub-15ms hybrid RRF search, and automated PR review checks against real requirement blast radiuses.
          </div>
          <a
            href="#capabilities"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#1B2A4A] font-semibold text-xs hover:bg-slate-100 transition-colors shadow-xs shrink-0"
          >
            <span>Explore Capabilities</span>
            <ArrowDownRight className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </section>
  );
}
