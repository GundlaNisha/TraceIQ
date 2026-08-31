"use client";

import React, { useState } from "react";

export function ArchitectureSection() {
  const [activeLayer, setActiveLayer] = useState<number>(0);

  const layers = [
    {
      id: "client",
      name: "01. Client & Interface Layer",
      badge: "Next.js 16 • React 19 • Clerk",
      description: "Server & client components with TanStack Query caching and Zustand workspace isolation.",
      nodes: [
        {
          title: "Next.js 16 Web Interface",
          sub: "App Router, TypeScript, Tailwind CSS",
          tag: "Port 3000",
        },
        {
          title: "Clerk Auth Sync",
          sub: "Multi-tenant tokens & RBAC verification",
          tag: "JWT / Session",
        },
        {
          title: "TanStack & Zustand",
          sub: "Active workspace & repository context",
          tag: "X-Workspace-Id",
        },
      ],
      telemetry: {
        latency: "< 24ms First Paint",
        throughput: "Client Edge Cached",
      },
    },
    {
      id: "gateway",
      name: "02. API & Gateway Layer",
      badge: "FastAPI • PostgreSQL • Redis",
      description: "Asynchronous REST API with Alembic migrations, pgvector indexes, and Redis task dispatching.",
      nodes: [
        {
          title: "FastAPI REST API",
          sub: "Async routes with Pydantic v2 validation",
          tag: "Port 8000",
        },
        {
          title: "PostgreSQL + pgvector",
          sub: "Relational tables + 384d cosine indexes",
          tag: "ACID / pgvector",
        },
        {
          title: "Redis Task Broker",
          sub: "Celery queue & session cache",
          tag: "In-Memory",
        },
      ],
      telemetry: {
        latency: "< 15ms Hybrid RRF",
        throughput: "1,200 req/sec Async",
      },
    },
    {
      id: "workers",
      name: "03. Async Worker Layer",
      badge: "Celery • Tree-sitter • Gemini 384d",
      description: "Distributed workers executing multi-language AST extraction, graph traversal, and embedding generation.",
      nodes: [
        {
          title: "Celery Task Workers",
          sub: "Concurrent repo sync & PR review jobs",
          tag: "Distributed Workers",
        },
        {
          title: "Tree-sitter AST Engine",
          sub: "Multi-language symbol & call graph parsing",
          tag: "Native Grammars",
        },
        {
          title: "Gemini Vector Embedder",
          sub: "384d dense embeddings (0 MB Server RAM)",
          tag: "Google Gemini 2.0",
        },
      ],
      telemetry: {
        latency: "< 3.2s Repo Indexing",
        throughput: "100k AST Nodes / min",
      },
    },
    {
      id: "integrations",
      name: "04. External Integrations Layer",
      badge: "GitHub App • Jira REST API • LiteLLM",
      description: "Bidirectional GitHub App webhooks, Jira Kanban integration, and multi-model AI dispatching.",
      nodes: [
        {
          title: "LiteLLM AI Dispatcher",
          sub: "OpenAI, Gemini 2.0, DeepSeek routing",
          tag: "Structured JSON",
        },
        {
          title: "GitHub App Webhooks",
          sub: "PR events, commit checks, inline comments",
          tag: "HMAC Signed",
        },
        {
          title: "Jira REST API Client",
          sub: "Kanban boards, sprints, and ADF converter",
          tag: "REST API v3",
        },
      ],
      telemetry: {
        latency: "Real-Time Webhook ACK",
        throughput: "Multi-Provider Fallback",
      },
    },
  ];

  return (
    <section id="architecture" className="py-20 md:py-28 bg-[#1B2A4A] text-[#F8F6F2] relative overflow-hidden">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-mono tracking-wider uppercase mb-3 border border-white/10">
            <span>Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight leading-tight text-white">
            Engineered for high-throughput <br />
            <span className="italic text-emerald-400">AST code intelligence</span>.
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
            Decouples synchronous gateway queries, asynchronous AST workers, and AI dispatching into an event-driven system with zero server-side embedding RAM overhead.
          </p>
        </div>

        {/* Layer Selection Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-8">
          {layers.map((layer, idx) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(idx)}
              className={`p-3 rounded-xl text-left border transition-all ${
                activeLayer === idx
                  ? "bg-white text-[#1B2A4A] border-white shadow-md scale-[1.01]"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-80">
                Layer 0{idx + 1}
              </div>
              <div className="font-serif font-bold text-xs sm:text-sm mt-0.5 truncate">
                {layer.name.split(". ")[1]}
              </div>
            </button>
          ))}
        </div>

        {/* Architectural Canvas */}
        <div className="rounded-2xl bg-white/95 text-[#111111] p-5 sm:p-7 border border-white/20 shadow-xl backdrop-blur-md">
          
          {/* Active Layer Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1B2A4A]/10 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#1B2A4A] text-white font-mono text-[10px] font-bold">
                  LAYER {activeLayer + 1} OF 4
                </span>
                <span className="font-mono text-xs text-[#6B7280]">
                  {layers[activeLayer].badge}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#1B2A4A] mt-1">
                {layers[activeLayer].name}
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5 max-w-xl">
                {layers[activeLayer].description}
              </p>
            </div>

            {/* Telemetry Pills */}
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <div className="px-2.5 py-1 rounded-lg bg-[#F8F6F2] border border-[#1B2A4A]/10">
                <span className="text-[#6B7280]">Perf: </span>
                <span className="font-bold text-[#1B2A4A]">{layers[activeLayer].telemetry.latency}</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-[#F8F6F2] border border-[#1B2A4A]/10">
                <span className="text-[#6B7280]">Scale: </span>
                <span className="font-bold text-[#1B2A4A]">{layers[activeLayer].telemetry.throughput}</span>
              </div>
            </div>
          </div>

          {/* Node Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
            {layers[activeLayer].nodes.map((node, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-[#F8F6F2] border border-[#1B2A4A]/15 shadow-xs hover:border-[#1B2A4A]/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1B2A4A] text-white flex items-center justify-center font-mono text-xs font-bold">
                    0{i + 1}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white text-[#1B2A4A] font-mono text-[10px] font-bold border border-[#1B2A4A]/10">
                    {node.tag}
                  </span>
                </div>
                <h4 className="font-serif font-bold text-sm text-[#111111]">{node.title}</h4>
                <p className="text-xs text-[#6B7280] font-sans mt-0.5 leading-relaxed">
                  {node.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Data Flow Pipeline Bar */}
          <div className="p-3.5 rounded-xl bg-[#1B2A4A] text-white">
            <div className="flex items-center justify-between text-xs mb-2.5 font-mono">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                END-TO-END DATA FLOW PIPELINE
              </span>
              <span className="text-slate-300 text-[11px]">Asynchronous Event Loop</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-lg bg-white/10 border border-white/15">
                <div className="text-[9px] text-slate-300 uppercase">1. Ingress</div>
                <div className="font-bold text-white text-[11px] mt-0.5">GitHub / Jira Webhook</div>
              </div>
              <div className="p-2 rounded-lg bg-white/10 border border-white/15">
                <div className="text-[9px] text-slate-300 uppercase">2. Gateway</div>
                <div className="font-bold text-white text-[11px] mt-0.5">FastAPI &amp; pgvector</div>
              </div>
              <div className="p-2 rounded-lg bg-white/10 border border-white/15">
                <div className="text-[9px] text-slate-300 uppercase">3. Parsing</div>
                <div className="font-bold text-white text-[11px] mt-0.5">Celery &amp; Tree-sitter</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                <div className="text-[9px] uppercase">4. Intelligence</div>
                <div className="font-bold text-[11px] mt-0.5">PR Review &amp; Matrix</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
