"use client";

import React, { useState } from "react";
import { Cpu, Zap, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type ProviderName = "gemini" | "groq" | "opencode";

export function MultiProviderVisual() {
  const [degradedProvider, setDegradedProvider] = useState<ProviderName | null>(null);

  const providers: {
    id: ProviderName;
    name: string;
    model: string;
    role: string;
    latency: string;
  }[] = [
    {
      id: "gemini",
      name: "Google Gemini",
      model: "gemini/gemini-3.6-flash",
      role: "Primary + 384d Embeddings",
      latency: "420ms",
    },
    {
      id: "groq",
      name: "Groq Cloud",
      model: "groq/llama-3.3-70b-versatile",
      role: "Round-Robin Pool",
      latency: "310ms",
    },
    {
      id: "opencode",
      name: "OpenCode Zen",
      model: "opencode/qwen-coder",
      role: "Failover Pool",
      latency: "480ms",
    },
  ];

  const activeFallback =
    degradedProvider === "gemini"
      ? "Groq Cloud"
      : degradedProvider === "groq"
        ? "OpenCode Zen"
        : degradedProvider === "opencode"
          ? "Google Gemini"
          : "Round-Robin Healthy (All 3 Active)";

  return (
    <div className="my-6 rounded-2xl bg-[#0B132B] text-slate-200 border border-white/15 overflow-hidden shadow-xl">
      <div className="px-5 py-3.5 bg-[#111C3A] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            MultiProviderRouter // Failover Simulator
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          GET /api/v1/health/ai
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* SVG Routing Visual */}
        <svg
          viewBox="0 0 680 120"
          className="w-full h-auto rounded-xl bg-[#080E21] border border-white/10 p-2"
          role="img"
          aria-label="MultiProviderRouter round-robin dispatch and automatic cooldown failover diagram"
        >
          {/* Dispatcher Box */}
          <rect x="16" y="34" width="165" height="52" rx="10" fill="#1B2A4A" stroke="#38BDF8" strokeWidth="1.5" />
          <text x="98.5" y="56" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="monospace">
            MultiProviderRouter
          </text>
          <text x="98.5" y="72" textAnchor="middle" fill="#7DD3FC" fontSize="9" fontFamily="monospace">
            chat_complete()
          </text>

          {/* Provider Boxes */}
          {providers.map((p, idx) => {
            const xPos = 240 + idx * 145;
            const isCooling = degradedProvider === p.id;
            return (
              <g key={p.id}>
                <path
                  d={`M 181 60 C 205 60, 215 ${idx === 0 ? 30 : idx === 1 ? 60 : 90}, ${xPos} 60`}
                  stroke={isCooling ? "#F43F5E" : "#34D399"}
                  strokeWidth="2"
                  strokeDasharray={isCooling ? "4 4" : undefined}
                  fill="none"
                />
                <rect
                  x={xPos}
                  y="24"
                  width="128"
                  height="72"
                  rx="10"
                  fill={isCooling ? "#2A0F18" : "#0B2922"}
                  stroke={isCooling ? "#FB7185" : "#34D399"}
                  strokeWidth="1.5"
                />
                <text x={xPos + 64} y="46" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="monospace">
                  {p.name}
                </text>
                <text x={xPos + 64} y="63" textAnchor="middle" fill={isCooling ? "#FDA4AF" : "#6EE7B7"} fontSize="9" fontFamily="monospace">
                  {isCooling ? "COOLDOWN (60s)" : `HEALTHY (${p.latency})`}
                </text>
                <text x={xPos + 64} y="80" textAnchor="middle" fill="#94A3B8" fontSize="8.5" fontFamily="monospace">
                  {p.role}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Interactive Simulator Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {providers.map((p) => {
            const isCooling = degradedProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setDegradedProvider(isCooling ? null : p.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isCooling
                    ? "bg-rose-500/10 border-rose-400/40"
                    : "bg-white/[0.03] border-white/10 hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="font-bold text-white">{p.name}</span>
                  {isCooling ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">{p.model}</div>
                <div className="mt-2 text-[10px] font-mono text-sky-300">
                  {isCooling ? "Click to restore healthy" : "Click to simulate 429 limit"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Telemetry Banner */}
        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-300">Next Request Dispatched To:</span>
            <span className="font-bold text-emerald-300">{activeFallback}</span>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Zero User-Facing Error
          </span>
        </div>
      </div>
    </div>
  );
}
