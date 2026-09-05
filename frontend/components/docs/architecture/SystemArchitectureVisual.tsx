"use client";

import React, { useState } from "react";
import { 
  Globe, 
  Layers, 
  FileCode2, 
  Sparkles, 
  ShieldCheck, 
  Code2
} from "lucide-react";

export function SystemArchitectureVisual() {
  const [selectedId, setSelectedId] = useState<string>("rrf");

  return (
    <div className="my-8 rounded-2xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-10 lg:p-12 transition-all">
      
      {/* Central Architecture Flow Canvas */}
      <div className="flex flex-col items-center max-w-2xl mx-auto">
        
        {/* ============================================================
            1. TOP NODE: User & Event Ingress (Light Card)
            ============================================================ */}
        <div 
          onClick={() => setSelectedId("ingress")}
          className={`w-full max-w-sm rounded-xl border bg-white p-4 shadow-2xs transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
            selectedId === "ingress"
              ? "border-slate-900 ring-2 ring-slate-900/10 shadow-sm"
              : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900">
              User &amp; Event Ingress
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              Next.js Web App, GitHub PRs &amp; Jira Webhooks
            </div>
          </div>
        </div>

        {/* ============================================================
            VERTICAL CONNECTOR 1 (with animated moving particle)
            ============================================================ */}
        <div className="h-10 w-full flex items-center justify-center relative overflow-visible">
          <svg className="h-10 w-4 overflow-visible" viewBox="0 0 16 40">
            <line x1="8" y1="0" x2="8" y2="40" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle r="3" fill="#10B981">
              <animate attributeName="cy" from="0" to="40" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="cx" values="8;8" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* ============================================================
            2. SUPERVISOR NODE: Gateway & Broker (Dark Card)
            ============================================================ */}
        <div 
          onClick={() => setSelectedId("supervisor")}
          className={`w-full max-w-sm rounded-xl border bg-[#18181B] p-4 text-white shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
            selectedId === "supervisor"
              ? "border-sky-400 ring-2 ring-sky-400/30 shadow-lg"
              : "border-zinc-800 hover:border-zinc-700 hover:shadow-lg"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white">
              Supervisor Gateway
            </div>
            <div className="text-xs text-zinc-400 mt-0.5 truncate">
              Async FastAPI routing &amp; Celery task broker
            </div>
          </div>
        </div>

        {/* ============================================================
            VERTICAL CONNECTOR 2 (with animated moving particle)
            ============================================================ */}
        <div className="h-10 w-full flex items-center justify-center relative overflow-visible">
          <svg className="h-10 w-4 overflow-visible" viewBox="0 0 16 40">
            <line x1="8" y1="0" x2="8" y2="40" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle r="3" fill="#38BDF8">
              <animate attributeName="cy" from="0" to="40" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="cx" values="8;8" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* ============================================================
            3. THREE PARALLEL NODES (Desktop Grid with Horizontal Line)
            ============================================================ */}
        <div className="w-full relative">
          
          {/* Desktop Layout: 3 cards with horizontal line passing behind */}
          <div className="hidden md:grid md:grid-cols-3 gap-4 items-center relative">
            
            {/* Horizontal Connector Line behind cards */}
            <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-px pointer-events-none z-0 overflow-visible">
              <svg className="w-full h-2 overflow-visible" preserveAspectRatio="none">
                <line x1="0" y1="1" x2="100%" y2="1" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
                {/* Left to Center moving pulse */}
                <circle r="2.5" fill="#8B5CF6">
                  <animate attributeName="cx" values="10%;50%" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="1;1" dur="2.2s" repeatCount="indefinite" />
                </circle>
                {/* Center to Right moving pulse */}
                <circle r="2.5" fill="#0EA5E9">
                  <animate attributeName="cx" values="50%;90%" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="1;1" dur="2.2s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>

            {/* Left Card: Tree-sitter AST */}
            <div 
              onClick={() => setSelectedId("ast")}
              className={`rounded-xl border bg-white p-4 text-center relative z-10 cursor-pointer transition-all duration-200 min-h-[104px] flex flex-col justify-center ${
                selectedId === "ast"
                  ? "border-purple-600 ring-2 ring-purple-600/15 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="text-sm font-bold text-slate-900">
                Tree-sitter AST
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                Parses syntax &amp; maps 2-hop caller blast radius
              </div>
            </div>

            {/* Center Card (Primary Highlighted): Hybrid RRF Core */}
            <div 
              onClick={() => setSelectedId("rrf")}
              className={`rounded-xl border bg-white border-b-2 border-b-slate-900 p-4 text-center relative z-10 cursor-pointer transition-all duration-200 min-h-[104px] flex flex-col justify-center shadow-xs ${
                selectedId === "rrf"
                  ? "ring-2 ring-slate-900/15 shadow-md"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="text-sm font-bold text-slate-900">
                Hybrid RRF Core
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                Dense Gemini vectors &amp; sub-15ms rank fusion
              </div>
            </div>

            {/* Right Card: Review Orchestrator */}
            <div 
              onClick={() => setSelectedId("review")}
              className={`rounded-xl border bg-white p-4 text-center relative z-10 cursor-pointer transition-all duration-200 min-h-[104px] flex flex-col justify-center ${
                selectedId === "review"
                  ? "border-sky-600 ring-2 ring-sky-600/15 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="text-sm font-bold text-slate-900">
                Review Orchestrator
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                LiteLLM multi-model evaluation against Jira specs
              </div>
            </div>

          </div>

          {/* Mobile Stacking Layout (< md) */}
          <div className="md:hidden space-y-3">
            <div 
              onClick={() => setSelectedId("ast")}
              className={`rounded-xl border bg-white p-4 text-center cursor-pointer transition-all ${
                selectedId === "ast" ? "border-purple-600 ring-2 ring-purple-600/15" : "border-slate-200"
              }`}
            >
              <div className="text-sm font-bold text-slate-900">Tree-sitter AST</div>
              <div className="text-xs text-slate-500 mt-0.5">Parses syntax &amp; maps 2-hop caller blast radius</div>
            </div>

            <div 
              onClick={() => setSelectedId("rrf")}
              className={`rounded-xl border bg-white border-b-2 border-b-slate-900 p-4 text-center cursor-pointer transition-all ${
                selectedId === "rrf" ? "ring-2 ring-slate-900/15 shadow-sm" : "border-slate-200"
              }`}
            >
              <div className="text-sm font-bold text-slate-900">Hybrid RRF Core</div>
              <div className="text-xs text-slate-500 mt-0.5">Dense Gemini vectors &amp; sub-15ms rank fusion</div>
            </div>

            <div 
              onClick={() => setSelectedId("review")}
              className={`rounded-xl border bg-white p-4 text-center cursor-pointer transition-all ${
                selectedId === "review" ? "border-sky-600 ring-2 ring-sky-600/15" : "border-slate-200"
              }`}
            >
              <div className="text-sm font-bold text-slate-900">Review Orchestrator</div>
              <div className="text-xs text-slate-500 mt-0.5">LiteLLM multi-model evaluation against Jira specs</div>
            </div>
          </div>

        </div>

        {/* ============================================================
            VERTICAL CONNECTOR 3 (with animated moving particle)
            ============================================================ */}
        <div className="h-10 w-full flex items-center justify-center relative overflow-visible">
          <svg className="h-10 w-4 overflow-visible" viewBox="0 0 16 40">
            <line x1="8" y1="0" x2="8" y2="40" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle r="3" fill="#10B981">
              <animate attributeName="cy" from="0" to="40" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="cx" values="8;8" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* ============================================================
            4. BOTTOM NODE: Structured Output (Dark Card)
            ============================================================ */}
        <div 
          onClick={() => setSelectedId("output")}
          className={`w-full max-w-sm rounded-xl border bg-[#18181B] p-4 text-white shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
            selectedId === "output"
              ? "border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg"
              : "border-zinc-800 hover:border-zinc-700 hover:shadow-lg"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm shrink-0">
            &lt;/&gt;
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white font-mono">
              Structured Output
            </div>
            <div className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
              PostgreSQL pgvector, PR comments &amp; Jira sync
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
