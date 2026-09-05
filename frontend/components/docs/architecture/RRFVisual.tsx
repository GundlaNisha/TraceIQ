"use client";

import React, { useState } from "react";
import { 
  Binary, 
  Search, 
  Database, 
  FileCode2, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  CheckCircle2 
} from "lucide-react";

export function RRFVisual() {
  const [activeSignal, setActiveSignal] = useState<"all" | "dense" | "bm25" | "symbols">("all");

  return (
    <div className="my-6 rounded-2xl bg-[#0B132B] text-slate-200 border border-white/15 overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="px-5 py-3.5 bg-[#111C3A] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            HYBRID RECIPROCAL RANK FUSION (RRF k=60)
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          Sub-15ms Latency
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* 3 Signal Sources Stream Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Signal 1 */}
          <div 
            onClick={() => setActiveSignal("dense")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeSignal === "all" || activeSignal === "dense"
                ? "bg-blue-500/10 border-blue-400/40 text-white"
                : "opacity-40 bg-white/[0.02] border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                Signal 1 (w=1.0)
              </span>
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <h5 className="font-serif font-bold text-sm text-white">Dense Vector Embeddings</h5>
            <p className="text-xs text-slate-300 font-sans mt-1">
              Google Gemini 2.0 384d vectors with hierarchical context breadcrumbs injected into chunk headers.
            </p>
            <div className="mt-3 pt-2 border-t border-white/10 font-mono text-[10px] text-blue-300">
              pgvector Cosine Distance (&lt;=&gt;)
            </div>
          </div>

          {/* Signal 2 */}
          <div 
            onClick={() => setActiveSignal("bm25")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeSignal === "all" || activeSignal === "bm25"
                ? "bg-purple-500/10 border-purple-400/40 text-white"
                : "opacity-40 bg-white/[0.02] border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
                Signal 2 (w=0.8)
              </span>
              <Search className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <h5 className="font-serif font-bold text-sm text-white">Full-Text Pattern Matching</h5>
            <p className="text-xs text-slate-300 font-sans mt-1">
              PostgreSQL English dictionary tsvector matching exact error strings and variable names.
            </p>
            <div className="mt-3 pt-2 border-t border-white/10 font-mono text-[10px] text-purple-300">
              ts_rank_cd(chunk_tsvector, query)
            </div>
          </div>

          {/* Signal 3 */}
          <div 
            onClick={() => setActiveSignal("symbols")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeSignal === "all" || activeSignal === "symbols"
                ? "bg-emerald-500/10 border-emerald-400/40 text-white"
                : "opacity-40 bg-white/[0.02] border-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                Signal 3 (w=1.2)
              </span>
              <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h5 className="font-serif font-bold text-sm text-white">Exact AST Symbol Match</h5>
            <p className="text-xs text-slate-300 font-sans mt-1">
              Deterministic matching against classes, functions, and interfaces parsed by Tree-sitter.
            </p>
            <div className="mt-3 pt-2 border-t border-white/10 font-mono text-[10px] text-emerald-300">
              code_symbols WHERE name ILIKE query
            </div>
          </div>

        </div>

        {/* Fusion Convergence Block */}
        <div className="p-4 rounded-xl bg-white/[0.05] border border-white/15 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-base shrink-0">
              Σ
            </div>
            <div>
              <div className="font-bold text-white font-serif text-sm">
                Reciprocal Rank Fusion Formula
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                RRF_Score(d) = Σ [ w_signal / ( 60 + rank_signal(d) ) ]
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-bold">Zero Re-ranking LLM Latency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
