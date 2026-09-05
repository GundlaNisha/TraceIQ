"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  AlertTriangle,
  Flame,
  Clock
} from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  file: string;
  type: "seed" | "hop1" | "hop2";
  risk: "high" | "medium" | "low";
  lang: string;
  // Position hints in percentage of canvas (x%, y%)
  posX: number;
  posY: number;
  symbols: string[];
  callCount: number;
}

interface EdgeDefinition {
  id: string;
  from: string;
  to: string;
  risk: "high" | "medium" | "low";
}

interface ComputedPath {
  id: string;
  d: string;
  risk: "high" | "medium" | "low";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const NODES: NodeData[] = [
  {
    id: "seed",
    label: "JWTDecoder.verify_token",
    file: "backend/app/ai/jwt.py",
    type: "seed",
    risk: "high",
    lang: "Python",
    posX: 34,
    posY: 50,
    symbols: ["decode_signature", "validate_exp", "claims_schema"],
    callCount: 142,
  },
  {
    id: "hop1_auth",
    label: "AuthMiddleware.dispatch",
    file: "backend/app/modules/auth/guard.py",
    type: "hop1",
    risk: "high",
    lang: "Python",
    posX: 60,
    posY: 27,
    symbols: ["authenticate_request", "extract_bearer"],
    callCount: 89,
  },
  {
    id: "hop1_session",
    label: "SessionStore.revoke_token",
    file: "backend/app/db/session.py",
    type: "hop1",
    risk: "medium",
    lang: "Python",
    posX: 60,
    posY: 73,
    symbols: ["redis_setex", "is_blacklisted"],
    callCount: 44,
  },
  {
    id: "hop2_billing",
    label: "BillingGuard.check_quota",
    file: "backend/app/modules/billing/meter.py",
    type: "hop2",
    risk: "medium",
    lang: "Python",
    posX: 86,
    posY: 18,
    symbols: ["tenant_tier_check", "stripe_customer"],
    callCount: 28,
  },
  {
    id: "hop2_api",
    label: "APIKeyValidator.resolve",
    file: "backend/app/modules/auth/keys.py",
    type: "hop2",
    risk: "low",
    lang: "Python",
    posX: 86,
    posY: 52,
    symbols: ["hash_secret", "rate_limiter"],
    callCount: 19,
  },
  {
    id: "hop2_worker",
    label: "CeleryWorker.sync_task",
    file: "backend/app/workers/indexing.py",
    type: "hop2",
    risk: "low",
    lang: "Python",
    posX: 86,
    posY: 84,
    symbols: ["dispatch_job", "ack_payload"],
    callCount: 12,
  },
];

const EDGES: EdgeDefinition[] = [
  { id: "e-seed-auth", from: "seed", to: "hop1_auth", risk: "high" },
  { id: "e-seed-session", from: "seed", to: "hop1_session", risk: "medium" },
  { id: "e-auth-billing", from: "hop1_auth", to: "hop2_billing", risk: "medium" },
  { id: "e-auth-api", from: "hop1_auth", to: "hop2_api", risk: "low" },
  { id: "e-session-worker", from: "hop1_session", to: "hop2_worker", risk: "low" },
];

export function HeroGraphVisual() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("seed");
  const containerRef = useRef<HTMLDivElement>(null);
  const [computedPaths, setComputedPaths] = useState<ComputedPath[]>([]);

  // Function to re-measure all node positions and compute gapless cubic bezier curves
  const updateConnections = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    if (containerRect.width === 0 || containerRect.height === 0) return;

    const paths: ComputedPath[] = [];

    for (const edge of EDGES) {
      const fromEl = container.querySelector<HTMLElement>(`[data-node-id="${edge.from}"]`);
      const toEl = container.querySelector<HTMLElement>(`[data-node-id="${edge.to}"]`);

      if (fromEl && toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // Exact center-right of source node
        const startX = fromRect.right - containerRect.left;
        const startY = fromRect.top + fromRect.height / 2 - containerRect.top;

        // Exact center-left of destination node
        const endX = toRect.left - containerRect.left;
        const endY = toRect.top + toRect.height / 2 - containerRect.top;

        // Smooth cubic bezier curvature
        const dx = Math.max(35, (endX - startX) * 0.45);
        const d = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

        paths.push({
          id: edge.id,
          d,
          risk: edge.risk,
          startX,
          startY,
          endX,
          endY,
        });
      }
    }

    setComputedPaths(paths);
  }, []);

  // Update on mount, window resize, and DOM container resize
  useEffect(() => {
    updateConnections();

    const handleResize = () => {
      updateConnections();
    };

    window.addEventListener("resize", handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => {
        updateConnections();
      });
      ro.observe(containerRef.current);
    }

    // Small delay to allow fonts and dimensions to settle
    const timeout = setTimeout(updateConnections, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ro) ro.disconnect();
      clearTimeout(timeout);
    };
  }, [updateConnections]);

  const selectedNode = NODES.find((n) => n.id === selectedNodeId) || NODES[0];

  return (
    <div className="relative w-full rounded-2xl bg-white/90 border border-[#1B2A4A]/15 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Top Window Chrome Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-xs text-[#6B7280]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80 shadow-xs" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80 shadow-xs" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 shadow-xs" />
          </div>
          <span className="font-mono text-[11px] text-[#1B2A4A] font-semibold pl-2 tracking-tight">
            AST_BLAST_RADIUS_ENGINE // v0.2.0
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-semibold border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            LIVE RRF RETRIEVAL
          </span>
          <span className="text-[#1B2A4A] font-bold px-1.5 py-0.5 bg-white rounded border border-[#1B2A4A]/10">
            11.4 ms
          </span>
        </div>
      </div>

      {/* Requirement Context Banner */}
      <div className="px-4 py-2 bg-[#1B2A4A]/[0.03] border-b border-[#1B2A4A]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#1B2A4A] uppercase tracking-wider text-[10px] bg-[#1B2A4A]/10 px-1.5 py-0.5 rounded font-mono">
            Active Requirement
          </span>
          <span className="text-[#111111] font-semibold truncate max-w-xs sm:max-w-md">
            REQ-84: Enforce Token Rotation &amp; Blacklist Traversal
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-[#6B7280]">
          <span>Scope:</span>
          <span className="px-2 py-0.5 bg-[#1B2A4A] rounded text-white font-bold">
            2-Hop AST Traversal
          </span>
        </div>
      </div>

      {/* Interactive Visual Graph Canvas */}
      <div 
        ref={containerRef}
        className="relative h-[320px] sm:h-[350px] w-full bg-[#FAFAF8] bg-grid-pattern overflow-hidden select-none"
      >
        {/* Dynamic SVG Directed Edges Layer with Zero-Gap Guarantee */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <linearGradient id="edgeGradHigh" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1B2A4A" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="edgeGradMed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1B2A4A" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="edgeGradLow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1B2A4A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {computedPaths.map((path) => {
            const isHigh = path.risk === "high";
            const isMed = path.risk === "medium";
            const grad = isHigh ? "url(#edgeGradHigh)" : isMed ? "url(#edgeGradMed)" : "url(#edgeGradLow)";
            const strokeColor = isHigh ? "#E11D48" : isMed ? "#D97706" : "#10B981";

            return (
              <g key={path.id}>
                {/* Background Shadow Line */}
                <path
                  d={path.d}
                  stroke="rgba(27, 42, 74, 0.08)"
                  strokeWidth="5"
                  fill="none"
                />
                
                {/* Animated Primary Directed Curve */}
                <path
                  d={path.d}
                  stroke={grad}
                  strokeWidth={isHigh ? 2.5 : 2}
                  fill="none"
                  strokeDasharray={isHigh ? "6 4" : "5 5"}
                  className="animate-flow"
                />

                {/* Source Port Terminal Dot */}
                <circle
                  cx={path.startX}
                  cy={path.startY}
                  r="3.5"
                  fill="#1B2A4A"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />

                {/* Target Port Terminal Dot */}
                <circle
                  cx={path.endX}
                  cy={path.endY}
                  r="3.5"
                  fill={strokeColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Semantic Query Badge on Left */}
        <div className="absolute top-4 left-4 z-20 max-w-[170px] p-2.5 bg-white/95 border border-[#1B2A4A]/15 rounded-xl shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#6B7280] uppercase tracking-wider font-semibold">
            <Search className="w-2.5 h-2.5 text-accent" />
            <span>Semantic Seed</span>
          </div>
          <div className="text-[11px] font-serif font-bold text-[#111111] leading-snug mt-1">
            &quot;verify_token JWT expiration&quot;
          </div>
          <div className="mt-2 flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
            <Sparkles className="w-2.5 h-2.5 shrink-0" />
            <span className="font-semibold">Fused RRF k=60</span>
          </div>
        </div>

        {/* Nodes Canvas Cards */}
        {NODES.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isSeed = node.type === "seed";

          return (
            <div
              key={node.id}
              data-node-id={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              style={{
                left: `${node.posX}%`,
                top: `${node.posY}%`,
                transform: "translate(-50%, -50%)",
              }}
              className="absolute cursor-pointer z-10 group"
            >
              <div
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl border shadow-sm transition-all duration-200 select-none ${
                  isSelected
                    ? "bg-[#1B2A4A] text-white border-[#1B2A4A] scale-105 shadow-lg ring-2 ring-[#1B2A4A]/20"
                    : isSeed
                    ? "bg-[#1B2A4A] text-white border-[#1B2A4A] hover:scale-102 shadow-md"
                    : "bg-white/95 text-[#111111] border-[#1B2A4A]/15 hover:border-[#1B2A4A]/40 hover:bg-white hover:scale-102"
                }`}
              >
                {/* Risk Indicator Dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ${
                    node.risk === "high"
                      ? "bg-rose-500 ring-2 ring-rose-300/60"
                      : node.risk === "medium"
                      ? "bg-amber-500 ring-2 ring-amber-300/60"
                      : "bg-emerald-500 ring-2 ring-emerald-300/60"
                  }`}
                />

                <div className="flex flex-col text-left">
                  <span className={`text-[11px] font-mono font-bold leading-tight ${isSelected || isSeed ? "text-white" : "text-[#111111]"}`}>
                    {node.label.split(".")[0]}
                    <span className={isSelected || isSeed ? "text-emerald-300" : "text-[#1B2A4A]"}>
                      .{node.label.split(".")[1]}
                    </span>
                  </span>
                  <span className={`text-[9px] font-mono truncate max-w-[130px] mt-0.5 ${isSelected || isSeed ? "text-slate-300" : "text-[#6B7280]"}`}>
                    {node.file.split("/").pop()}
                  </span>
                </div>

                {/* Left/Right Anchor Ports (Visually Anchored to Edges) */}
                {node.type !== "seed" && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white" />
                )}
                {node.type !== "hop2" && (
                  <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white" />
                )}
              </div>

              {/* Hop Level Badge Below Card */}
              <div className="flex justify-center mt-1.5">
                <span
                  className={`text-[8px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full shadow-2xs ${
                    node.type === "seed"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : node.type === "hop1"
                      ? "bg-[#1B2A4A]/10 text-[#1B2A4A] border border-[#1B2A4A]/20"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {node.type === "seed" ? "SEED (RRF #1)" : node.type === "hop1" ? "1-HOP" : "2-HOP"}
                </span>
              </div>
            </div>
          );
        })}

        {/* Risk Prediction Summary Overlay Card on Bottom Right */}
        <div className="absolute bottom-3 right-3 z-20 p-3 bg-[#1B2A4A] text-[#F8F6F2] rounded-xl shadow-lg border border-white/10 text-xs backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
              Blast Radius
            </span>
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono text-[9px] font-bold rounded-full border border-rose-500/40 flex items-center gap-1">
              <Flame className="w-2.5 h-2.5" />
              HIGH RISK
            </span>
          </div>
          <div className="text-sm font-bold font-serif mt-1 text-white">
            6 Impacted Downstream Callers
          </div>
          <div className="text-[10px] text-slate-300 font-mono mt-0.5">
            Confidence: 96.8% • 2-Hop Traversal
          </div>
        </div>
      </div>

      {/* Bottom Node Inspector Bar */}
      <div className="p-3.5 bg-white border-t border-[#1B2A4A]/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#1B2A4A]/5 text-[#1B2A4A]">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-[#111111] font-mono text-xs">{selectedNode.label}</div>
            <div className="font-mono text-[10px] text-[#6B7280] truncate max-w-[220px]">
              {selectedNode.file}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#1B2A4A]/5 text-[#1B2A4A]">
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-[11px]">
            <div className="text-[#6B7280] font-medium">Extracted AST Symbols:</div>
            <div className="font-mono text-[10px] text-[#1B2A4A] font-semibold truncate max-w-[240px]">
              {selectedNode.symbols.join(", ")}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start md:justify-end gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F6F2] rounded-lg border border-[#1B2A4A]/10">
            <span className="text-[#6B7280]">pgvector:</span>
            <span className="font-bold text-[#1B2A4A]">0.94</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F6F2] rounded-lg border border-[#1B2A4A]/10">
            <span className="text-[#6B7280]">tsvector:</span>
            <span className="font-bold text-[#1B2A4A]">0.88</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
            <span className="text-emerald-600">Symbols:</span>
            <span className="font-bold">1.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
