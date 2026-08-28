"use client";

import React, { useState } from "react";
import { 
  GitBranch, 
  ShieldAlert, 
  Sparkles, 
  Search, 
  Terminal, 
  FileCode, 
  Layers, 
  Activity, 
  CheckCircle2, 
  ArrowUpRight,
  RefreshCw
} from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  file: string;
  type: "root" | "seed" | "hop1" | "hop2";
  risk: "high" | "medium" | "low" | "root";
  lang: string;
  x: number;
  y: number;
  symbols: string[];
}

export function HeroGraphVisual() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("seed");
  const [activeSignal, setActiveSignal] = useState<"all" | "vector" | "text" | "symbol">("all");

  const nodes: NodeData[] = [
    {
      id: "seed",
      label: "JWTDecoder.verify_token",
      file: "backend/app/ai/jwt.py",
      type: "seed",
      risk: "high",
      lang: "Python",
      x: 210,
      y: 130,
      symbols: ["decode_signature", "validate_exp", "claims_schema"],
    },
    {
      id: "hop1_auth",
      label: "AuthMiddleware.dispatch",
      file: "backend/app/modules/auth/guard.py",
      type: "hop1",
      risk: "high",
      lang: "Python",
      x: 360,
      y: 65,
      symbols: ["authenticate_request", "extract_bearer"],
    },
    {
      id: "hop1_session",
      label: "SessionStore.revoke_token",
      file: "backend/app/db/session.py",
      type: "hop1",
      risk: "medium",
      lang: "Python",
      x: 360,
      y: 195,
      symbols: ["redis_setex", "is_blacklisted"],
    },
    {
      id: "hop2_billing",
      label: "BillingGuard.check_quota",
      file: "backend/app/modules/billing/meter.py",
      type: "hop2",
      risk: "medium",
      lang: "Python",
      x: 520,
      y: 35,
      symbols: ["tenant_tier_check", "stripe_customer"],
    },
    {
      id: "hop2_api",
      label: "APIKeyValidator.resolve",
      file: "backend/app/modules/auth/keys.py",
      type: "hop2",
      risk: "low",
      lang: "Python",
      x: 520,
      y: 125,
      symbols: ["hash_secret", "rate_limiter"],
    },
    {
      id: "hop2_worker",
      label: "CeleryWorker.sync_task",
      file: "backend/app/workers/indexing.py",
      type: "hop2",
      risk: "low",
      lang: "Python",
      x: 520,
      y: 225,
      symbols: ["dispatch_job", "ack_payload"],
    },
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  return (
    <div className="relative w-full rounded-2xl bg-white/80 border border-[#1B2A4A]/15 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Top Window Chrome Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-xs text-[#6B7280]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1B2A4A]/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#1B2A4A]/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#1B2A4A]/20" />
          </div>
          <span className="font-mono text-[11px] text-[#1B2A4A] font-semibold pl-2">
            AST_BLAST_RADIUS_ENGINE // v0.1.0
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-medium border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            LIVE RRF RETRIEVAL
          </span>
          <span className="text-[#1B2A4A] font-semibold">11.4 ms</span>
        </div>
      </div>

      {/* Requirement Context Banner */}
      <div className="px-4 py-2 bg-[#1B2A4A]/5 border-b border-[#1B2A4A]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#1B2A4A] uppercase tracking-wider text-[10px]">Active Requirement:</span>
          <span className="text-[#111111] font-medium truncate max-w-xs sm:max-w-md">
            REQ-84: Enforce Token Rotation & Blacklist Traversal
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-[#6B7280]">
          <span>Scope:</span>
          <span className="px-1.5 py-0.2 bg-white rounded border border-[#1B2A4A]/10 text-[#1B2A4A] font-semibold">
            2-Hop Traversal
          </span>
        </div>
      </div>

      {/* Interactive Visual Graph Canvas */}
      <div className="relative h-[270px] sm:h-[300px] w-full bg-[#F8F6F2]/40 bg-grid-pattern p-2 overflow-hidden select-none">
        
        {/* SVG Directed Edges & Pulsing Particles */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 270">
          <defs>
            <linearGradient id="edgeGradHigh" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1B2A4A" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="edgeGradMed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1B2A4A" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="edgeGradLow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1B2A4A" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6B7280" stopOpacity="0.4" />
            </linearGradient>

            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connectors from Seed to Hop 1 */}
          <path
            d="M 230 130 C 290 130, 290 65, 340 65"
            stroke="url(#edgeGradHigh)"
            strokeWidth="2.5"
            fill="none"
            className="animate-flow"
          />
          <path
            d="M 230 130 C 290 130, 290 195, 340 195"
            stroke="url(#edgeGradMed)"
            strokeWidth="2.5"
            fill="none"
            className="animate-flow"
          />

          {/* Connectors from Hop 1 to Hop 2 */}
          <path
            d="M 380 65 C 440 65, 440 35, 500 35"
            stroke="url(#edgeGradMed)"
            strokeWidth="1.8"
            fill="none"
            strokeDasharray="4 4"
          />
          <path
            d="M 380 65 C 440 65, 440 125, 500 125"
            stroke="url(#edgeGradLow)"
            strokeWidth="1.8"
            fill="none"
            strokeDasharray="4 4"
          />
          <path
            d="M 380 195 C 440 195, 440 225, 500 225"
            stroke="url(#edgeGradLow)"
            strokeWidth="1.8"
            fill="none"
            strokeDasharray="4 4"
          />

          {/* Pulsing Traversal Rings on Seed Node */}
          <circle cx="210" cy="130" r="18" fill="none" stroke="#1B2A4A" strokeWidth="1" opacity="0.4" className="animate-ping-slow" />
          <circle cx="210" cy="130" r="26" fill="none" stroke="#E11D48" strokeWidth="0.8" opacity="0.2" className="animate-ping-slow" />
        </svg>

        {/* Render Graph Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isSeed = node.type === "seed";

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              style={{
                left: `${(node.x / 600) * 100}%`,
                top: `${(node.y / 270) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              className={`absolute cursor-pointer transition-all duration-200 z-10 group`}
            >
              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border shadow-sm transition-all ${
                  isSelected
                    ? "bg-[#1B2A4A] text-[#F8F6F2] border-[#1B2A4A] scale-105 shadow-md ring-2 ring-[#1B2A4A]/20"
                    : isSeed
                    ? "bg-white text-[#111111] border-[#E11D48]/60 hover:border-[#E11D48]"
                    : "bg-white/95 text-[#111111] border-[#1B2A4A]/15 hover:border-[#1B2A4A]/40 hover:scale-102"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    node.risk === "high"
                      ? "bg-rose-500"
                      : node.risk === "medium"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
                <div className="flex flex-col text-left">
                  <span className={`text-[11px] font-mono font-semibold leading-tight ${isSelected ? "text-white" : "text-[#111111]"}`}>
                    {node.label.split(".")[0]}
                    <span className={isSelected ? "text-emerald-300" : "text-[#1B2A4A]"}>
                      .{node.label.split(".")[1]}
                    </span>
                  </span>
                  <span className={`text-[9px] font-mono truncate max-w-[120px] ${isSelected ? "text-slate-300" : "text-[#6B7280]"}`}>
                    {node.file.split("/").pop()}
                  </span>
                </div>
              </div>

              {/* Hop Level Tag */}
              <span
                className={`absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[8px] font-mono uppercase font-bold tracking-wider px-1 rounded ${
                  node.type === "seed"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : node.type === "hop1"
                    ? "bg-[#1B2A4A]/10 text-[#1B2A4A]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {node.type === "seed" ? "SEED (RRF #1)" : node.type === "hop1" ? "1-HOP" : "2-HOP"}
              </span>
            </div>
          );
        })}

        {/* Interactive Query Seed Badge on Left */}
        <div className="absolute top-4 left-4 z-20 max-w-[160px] p-2 bg-white/90 border border-[#1B2A4A]/15 rounded-lg shadow-xs backdrop-blur-sm">
          <div className="text-[9px] font-mono text-[#6B7280] uppercase tracking-wider">Semantic Query</div>
          <div className="text-[11px] font-serif font-semibold text-[#111111] leading-tight mt-0.5">
            &quot;verify_token JWT signature expiration&quot;
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Fused via RRF k=60</span>
          </div>
        </div>

        {/* Risk Prediction Summary Overlay Card */}
        <div className="absolute bottom-3 right-4 z-20 p-2.5 bg-[#1B2A4A] text-[#F8F6F2] rounded-lg shadow-md border border-white/10 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] text-slate-300 uppercase tracking-wide">Blast Radius</span>
            <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 font-mono text-[9px] font-bold rounded border border-rose-500/40">
              HIGH RISK
            </span>
          </div>
          <div className="text-sm font-bold font-serif mt-1">6 Impacted Downstream Callers</div>
          <div className="text-[10px] text-slate-300 font-mono mt-0.5">Confidence: 96.8% • 2-Hop Traversal</div>
        </div>
      </div>

      {/* Bottom Inspector Bar */}
      <div className="p-3.5 bg-white border-t border-[#1B2A4A]/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-md bg-[#1B2A4A]/5 text-[#1B2A4A] mt-0.5">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-[#111111]">{selectedNode.label}</div>
            <div className="font-mono text-[10px] text-[#6B7280] truncate max-w-[200px]">
              {selectedNode.file}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#1B2A4A]/5 text-[#1B2A4A]">
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-[11px]">
            <div className="text-[#6B7280]">Extracted AST Symbols:</div>
            <div className="font-mono text-[10px] text-[#1B2A4A] font-medium truncate max-w-[220px]">
              {selectedNode.symbols.join(", ")}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F6F2] rounded border border-[#1B2A4A]/10">
            <span className="text-[#6B7280]">pgvector:</span>
            <span className="font-semibold text-[#1B2A4A]">0.94</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F6F2] rounded border border-[#1B2A4A]/10">
            <span className="text-[#6B7280]">tsvector:</span>
            <span className="font-semibold text-[#1B2A4A]">0.88</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
            <span className="text-emerald-600">Symbols:</span>
            <span className="font-semibold">1.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
