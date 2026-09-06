"use client";

import React from "react";
import {
  Monitor,
  Cloud,
  Bot,
  Database,
  FileText,
  Kanban,
  GitPullRequest,
  Grid3X3,
  MessageCircle,
  FileSearch,
  Files,
  BrainCircuit,
  SearchCode,
  Network,
  ShieldCheck,
  Mail,
  CalendarRange,
  ExternalLink,
  Boxes,
  Workflow,
  Cpu,
  Zap,
  GitBranch,
  Layers,
  Lock,
} from "lucide-react";

export function SystemArchitectureVisual() {
  return (
    <div className="my-8 w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#FAF9F7] p-2 sm:p-3 shadow-xs">
      <div className="w-full max-w-full overflow-hidden rounded-xl bg-[#FCFCFA] p-3 sm:p-4">
        {/* Title & Status */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1 mb-3">
          <h2 className="text-[18px] font-extrabold tracking-tight text-slate-900 leading-snug">
            TraceIQ — System Architecture
          </h2>
          <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-2xs leading-normal">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shrink-0">
              <ShieldCheck className="h-3 w-3" />
            </span>
            <span>Production-Grade • Event-Driven • Deterministic Reviews</span>
          </div>
        </div>

        <div className="space-y-1">
          {/* ============================================================
              1. CLIENT LAYER
              ============================================================ */}
          <Lane
            label="Client"
            color="#7A5CFA"
            icon={<Monitor className="h-4 w-4 opacity-90" />}
            bg="#7A5CFA"
          >
            <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4 py-1">
              {/* Left group: Input & Webhook Views */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <ClientPill 
                  icon={FileText} 
                  title="Requirements" 
                  subtitle="Spec Board" 
                  iconBg="bg-violet-100" 
                  iconColor="text-violet-600" 
                />
                <ClientPill 
                  icon={GitPullRequest} 
                  title="GitHub PR" 
                  subtitle="Diff Viewer" 
                  iconBg="bg-blue-100" 
                  iconColor="text-blue-600" 
                />
                <ClientPill 
                  icon={Kanban} 
                  title="Jira Issues" 
                  subtitle="Live Sync" 
                  iconBg="bg-emerald-100" 
                  iconColor="text-emerald-600" 
                />
              </div>

              {/* Center: Workspace Dashboard Card */}
              <div className="flex flex-col items-center justify-center shrink-0 px-2">
                <div className="relative flex h-[76px] w-[170px] flex-col items-center justify-center rounded-xl border border-slate-900 bg-slate-900 text-white shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-900">
                      <Workflow className="h-4 w-4" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 p-[2px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-900">
                        TQ
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 text-[11px] font-bold leading-tight text-white tracking-wide">
                    TraceIQ Workspace
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] leading-tight text-white/70">
                    Dashboard
                  </div>
                  <div className="absolute -bottom-1 left-1/2 h-[3px] w-16 -translate-x-1/2 rounded-b-[2px] bg-slate-700" />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-[11px] font-bold leading-tight text-slate-900">
                    Workspace Dashboard
                  </div>
                  <div className="mt-1 font-mono text-[10px] leading-tight text-slate-500">
                    Next.js 16 • Tailwind • Clerk
                  </div>
                </div>
              </div>

              {/* Right group: Impact & Audit Views */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <ClientPill 
                  icon={Grid3X3} 
                  title="Traceability" 
                  subtitle="Audit Matrix" 
                  iconBg="bg-sky-100" 
                  iconColor="text-sky-600" 
                />
                <ClientPill 
                  icon={Network} 
                  title="Blast Radius" 
                  subtitle="2-Hop Graph" 
                  iconBg="bg-amber-100" 
                  iconColor="text-amber-600" 
                />
                <ClientPill 
                  icon={ShieldCheck} 
                  title="Audit Logs" 
                  subtitle="PR Reviews" 
                  iconBg="bg-rose-100" 
                  iconColor="text-rose-600" 
                />
              </div>
            </div>
          </Lane>

          {/* Vertical Animated Connector: Client → API */}
          <VerticalConnector color="#7A5CFA" />

          {/* ============================================================
              2. API GATEWAY LAYER
              ============================================================ */}
          <Lane
            label="API"
            color="#0EA5B8"
            icon={<Cloud className="h-4 w-4 opacity-90" />}
            bg="#0EA5B8"
          >
            <div className="relative flex flex-col items-center gap-3.5 w-full py-1">
              <div className="w-full flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-bold text-[#0EA5B8] shadow-2xs">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0EA5B8] text-white shrink-0">
                    <Zap className="h-3 w-3" />
                  </span>
                  <span className="leading-tight">FastAPI Backend</span>
                  <span className="font-normal text-sky-700/80 leading-tight">(Python async)</span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <ApiPill icon={Layers} title="/workspaces" subtitle="Workspace CRUD" />
                <ApiPill icon={GitBranch} title="/repos" subtitle="Ingest Repo" />
                <ApiPill icon={FileText} title="/requirements" subtitle="Create & Link" />
                <ApiPill icon={SearchCode} title="/analysis" subtitle="Blast Radius" />
                <ApiPill icon={GitPullRequest} title="/reviews" subtitle="PR Reviews" />
                <ApiPill icon={ExternalLink} title="/jira" subtitle="Sync & Transition" />
              </div>

              <div className="w-full flex flex-wrap justify-center gap-2">
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] font-medium text-slate-600 leading-normal">
                  CORS • Pydantic Validation • X-Workspace-Id • Clerk Auth
                </div>
                <div className="hidden items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-mono text-[10px] font-medium text-violet-700 xl:inline-flex leading-normal">
                  HMAC-SHA256 • Isolated DB Sessions • Background Tasks
                </div>
              </div>
            </div>
          </Lane>

          {/* Vertical Animated Connector: API → Agents */}
          <VerticalConnector color="#0EA5B8" />

          {/* ============================================================
              3. AGENTS / COMPUTE LAYER
              ============================================================ */}
          <Lane
            label="Agents"
            color="#6D5AE0"
            icon={<Bot className="h-4 w-4 opacity-90" />}
            bg="#6D5AE0"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 w-full py-1">
              {/* Column 1: Extraction & Ingestion Agents */}
              <div className="space-y-2 xl:col-span-1">
                <AgentCard 
                  icon={FileSearch} 
                  title="Repo Sync Agent" 
                  subtitle="Clone & index repo" 
                  accent="border-violet-200 bg-violet-50/70" 
                  iconBg="bg-violet-600" 
                />
                <AgentCard 
                  icon={Files} 
                  title="Tree-sitter Parser" 
                  subtitle="AST & symbol graph" 
                  accent="border-sky-200 bg-sky-50/70" 
                  iconBg="bg-sky-600" 
                />
                <AgentCard 
                  icon={Database} 
                  title="Gemini Embedder" 
                  subtitle="384d vector + RRF" 
                  accent="border-amber-200 bg-amber-50/60" 
                  iconBg="bg-amber-500" 
                />
                <AgentCard 
                  icon={MessageCircle} 
                  title="Requirement Linker" 
                  subtitle="Jira ↔ Code map" 
                  accent="border-violet-200 bg-violet-50/70" 
                  iconBg="bg-violet-500" 
                />
              </div>

              {/* Column 2: Celery Supervisor */}
              <div className="xl:col-span-1 flex flex-col justify-start">
                <div className="rounded-xl border-2 border-[#6D5AE0] bg-white p-3 shadow-sm h-full flex flex-col justify-between">
                  <div>
                    <div className="flex gap-2.5 items-start">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6D5AE0] text-white">
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="text-xs font-extrabold leading-tight text-[#2A1F6A]">
                          Celery Supervisor
                        </div>
                        <div className="mt-1 font-mono text-[10px] leading-tight text-slate-500">
                          Orchestrates &amp; routes tasks
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] leading-tight text-slate-500">
                          to specialized workers
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#6D5AE0] shadow-2xs">
                        <Workflow className="h-3.5 w-3.5" />
                      </div>
                      <div className="font-mono text-[10px] font-bold leading-tight text-[#2A1F6A]">
                        Celery Beat • Redis
                        <span className="block font-normal text-slate-500 mt-0.5">
                          Retry • Rate-limit
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] font-bold text-slate-600 leading-normal">
                        <Lock className="h-3 w-3 text-[#6D5AE0]" />
                        <span>Human Review Gate</span>
                      </div>
                    </div>
                    <div className="mt-2 hidden justify-center gap-1.5 xl:flex">
                      <span className="rounded-full border border-violet-200 bg-white px-2 py-0.5 font-mono text-[9px] text-violet-700 leading-normal">
                        Round-robin failover
                      </span>
                      <span className="rounded-full border border-violet-200 bg-white px-2 py-0.5 font-mono text-[9px] text-violet-700 leading-normal">
                        Pydantic gating
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Intelligence & Analysis Agents */}
              <div className="space-y-2 xl:col-span-1">
                <AgentCardSmall 
                  icon={SearchCode} 
                  title="RRF Search Agent" 
                  subtitle="Hybrid retrieval k=60" 
                  accent="border-emerald-200" 
                />
                <AgentCardSmall 
                  icon={Network} 
                  title="Blast Radius Agent" 
                  subtitle="2-hop graph walk" 
                  accent="border-rose-200" 
                />
                <AgentCardSmall 
                  icon={ShieldCheck} 
                  title="Review Agent" 
                  subtitle="LiteLLM • PR comments" 
                  accent="border-sky-200" 
                />
              </div>

              {/* Column 4: Delivery Cluster */}
              <div className="xl:col-span-1">
                <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-2.5 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 px-1 pb-2 border-b border-violet-200/60 mb-2">
                      <Boxes className="h-3.5 w-3.5 text-[#6D5AE0]" />
                      <span className="text-[10px] font-bold leading-tight text-[#2A1F6A] uppercase tracking-wider">
                        Delivery Cluster
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <ClusterRow title="GitHub Comment Agent" />
                      <ClusterRow title="Jira Transition Agent" />
                      <ClusterRow title="ADF Converter Agent" />
                      <ClusterRow title="Traceability Builder" />
                      <ClusterRow title="Audit Export Agent" />
                    </div>
                  </div>
                  <div className="pt-2 text-center font-mono text-[9px] text-slate-400 leading-normal">
                    … and background workers
                  </div>
                </div>
              </div>
            </div>
          </Lane>

          {/* Vertical Animated Connector: Agents → Data */}
          <VerticalConnector color="#6D5AE0" />

          {/* ============================================================
              4. DATA & TOOLS LAYER
              ============================================================ */}
          <Lane
            label="Data & Tools"
            color="#16A34A"
            icon={<Database className="h-4 w-4 opacity-90" />}
            bg="#16A34A"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 w-full py-1">
              {/* Card 1: Vector Store */}
              <DataCard>
                <div className="text-xs font-bold leading-tight text-emerald-700">
                  1. Vector Store
                </div>
                <div className="mt-0.5 font-mono text-[10px] leading-tight text-slate-500">
                  PostgreSQL + pgvector
                </div>
                <div className="mt-3 flex gap-2.5 items-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs ring-1 ring-emerald-100">
                    <div className="relative">
                      <Database className="h-7 w-7 text-emerald-600" />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                        <Zap className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="rounded-lg border border-emerald-200 bg-white px-2 py-1 font-mono text-[10px] font-medium text-emerald-700 leading-normal truncate">
                      Code Embeddings
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white px-2 py-1 font-mono text-[10px] font-medium text-emerald-700 leading-normal truncate">
                      code_dependencies
                    </div>
                  </div>
                </div>
              </DataCard>

              {/* Card 2: Queue & Cache */}
              <DataCard>
                <div className="text-xs font-bold leading-tight text-amber-700">
                  2. Queue &amp; Cache
                </div>
                <div className="mt-0.5 font-mono text-[10px] leading-tight text-slate-500">
                  Redis + Celery • HNSW
                </div>
                <div className="mt-3 flex gap-2.5 items-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs ring-1 ring-amber-100">
                    <Cpu className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="rounded-lg border border-amber-200 bg-white px-2 py-1 font-mono text-[10px] font-medium text-amber-700 leading-normal truncate">
                      Task Broker
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white px-2 py-1 font-mono text-[10px] font-medium text-amber-700 leading-normal truncate">
                      HNSW Index
                    </div>
                  </div>
                </div>
              </DataCard>

              {/* Card 3: External Tools */}
              <DataCard>
                <div className="text-xs font-bold leading-tight text-rose-700">
                  3. External Tools
                </div>
                <div className="mt-0.5 font-mono text-[10px] leading-tight text-slate-500">
                  Integrations &amp; Services
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <ToolMini icon={ExternalLink} label="GitHub" sub="API" />
                  <ToolMini icon={Mail} label="Jira" sub="REST v3" />
                  <ToolMini icon={CalendarRange} label="Gemini" sub="2.0" />
                </div>
              </DataCard>

              {/* Card 4: Schema Guard */}
              <DataCard>
                <div className="text-xs font-bold leading-tight text-slate-700">
                  4. Schema Guard
                </div>
                <div className="mt-0.5 font-mono text-[10px] leading-tight text-slate-500">
                  Pydantic Validation
                </div>
                <div className="mt-3 flex gap-2 items-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs ring-1 ring-slate-200">
                    <ShieldCheck className="h-6 w-6 text-slate-700" />
                  </div>
                  <div className="flex flex-1 items-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-[10px] leading-relaxed text-slate-600">
                    Ensures strict, typed JSON outputs
                  </div>
                </div>
              </DataCard>
            </div>
          </Lane>

        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LAYOUT PRIMITIVES
   ============================================================ */

function Lane({
  children,
  label,
  color,
  icon,
  bg,
}: {
  children: React.ReactNode;
  label: string;
  color: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row">
      <div 
        className="flex w-full shrink-0 flex-row items-center justify-center gap-2 rounded-xl px-3 py-2 text-white shadow-xs lg:w-[46px] lg:flex-col lg:py-3" 
        style={{ background: bg }}
      >
        {icon}
        <span className="text-[11px] font-extrabold tracking-[0.18em] uppercase leading-none lg:hidden">
          {label}
        </span>
        <span 
          className="hidden text-[11px] font-extrabold tracking-[0.18em] uppercase lg:inline leading-none" 
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {label}
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs">
        {children}
      </div>
    </div>
  );
}

function DataCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs h-full flex flex-col justify-between">
      {children}
    </div>
  );
}

/* Animated Vertical Connection Line between Lanes */
function VerticalConnector({ color }: { color: string }) {
  return (
    <div className="flex gap-2 sm:gap-3 py-0.5">
      {/* Spacer aligned with vertical layer badge on desktop */}
      <div className="hidden w-[46px] shrink-0 lg:block" />
      <div className="flex flex-1 justify-center items-center">
        <div className="relative flex flex-col items-center h-7 w-6 justify-center">
          <svg className="h-7 w-6 overflow-visible" viewBox="0 0 24 28">
            {/* Guide line */}
            <line x1="12" y1="0" x2="12" y2="28" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Smooth animated downward moving pulse bead */}
            <circle r="3" fill={color} className="drop-shadow-xs">
              <animate attributeName="cy" from="0" to="28" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="cx" values="12;12" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;1;1;0.2" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONTENT COMPONENTS (with fixed vertical word spacing)
   ============================================================ */

function ClientPill({
  icon: Icon,
  title,
  subtitle,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center shadow-2xs hover:shadow-xs transition-shadow h-full min-h-[74px]">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg} ${iconColor} shrink-0`}>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="flex flex-col items-center mt-1.5">
        <div className="text-[11px] font-bold leading-tight text-slate-800">
          {title}
        </div>
        <div className="mt-0.5 font-mono text-[10px] leading-tight text-slate-500">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function ApiPill({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-2 py-2 sm:px-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0EA5B8] text-white sm:h-7 sm:w-7">
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="truncate font-mono text-[11px] font-bold text-[#0EA5B8] leading-tight sm:text-xs">
          {title}
        </div>
        <div className="truncate font-mono text-[9px] text-slate-500 leading-tight mt-0.5 sm:text-[10px]">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function AgentCard({
  icon: Icon,
  title,
  subtitle,
  accent,
  iconBg,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  accent: string;
  iconBg: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border bg-white px-2.5 py-2.5 shadow-2xs ${accent}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg} text-white`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="truncate text-[11px] font-bold text-slate-800 leading-tight">
          {title}
        </div>
        <div className="truncate font-mono text-[10px] text-slate-500 leading-tight mt-0.5">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function AgentCardSmall({
  icon: Icon,
  title,
  subtitle,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border bg-white px-2.5 py-2.5 shadow-2xs ${accent}`}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs ring-1 ring-slate-200">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="truncate text-[11px] font-bold text-slate-800 leading-tight">
          {title}
        </div>
        <div className="truncate font-mono text-[10px] text-slate-500 leading-tight mt-0.5">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function ClusterRow({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white px-2.5 py-1.5 text-center font-mono text-[10px] font-medium text-slate-700 shadow-2xs leading-normal">
      {title}
    </div>
  );
}

function ToolMini({
  icon: Icon,
  label,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-rose-200 bg-white px-1 py-2 text-center shadow-2xs">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500 text-white sm:h-7 sm:w-7">
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      </div>
      <div className="font-mono text-[10px] font-bold leading-tight text-slate-700 mt-0.5">
        {label}
      </div>
      <div className="font-mono text-[9px] leading-tight text-slate-500 mt-0.5">
        {sub}
      </div>
    </div>
  );
}