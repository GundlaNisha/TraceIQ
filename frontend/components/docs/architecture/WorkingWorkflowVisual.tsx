"use client";

import React, { useState } from "react";
import { 
  GitPullRequest, 
  Kanban, 
  Workflow, 
  FileCode2, 
  Sparkles, 
  Network, 
  CheckCircle2, 
  ArrowRight, 
  Database, 
  Zap, 
  Server, 
  ShieldCheck,
  Globe,
  Radio,
  Clock,
  Layers,
  Code2
} from "lucide-react";

interface WorkflowStep {
  stepNumber: number;
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  input: string;
  process: string;
  output: string;
  techStack: string[];
  latencyMetric: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stepNumber: 1,
    id: "ingestion",
    badge: "Stage 01 // Ingress",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    title: "Event Inbound & Instant ACK",
    shortDesc: "Captures developer PR updates and Jira requirement tickets via cryptographic HMAC webhooks.",
    icon: Globe,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    input: "GitHub PR opened/synchronized, Jira issue created/transitioned",
    process: "FastAPI gateway validates cryptographic HMAC-SHA256 signature, enforces X-Workspace-Id isolation, and dispatches a background task to Celery.",
    output: "Instant HTTP 200 OK ACK (< 30ms) to caller; queued Celery task in Redis.",
    techStack: ["FastAPI 3.11", "Redis Broker", "HMAC-SHA256", "Clerk RBAC"],
    latencyMetric: "< 30ms Instant Response"
  },
  {
    stepNumber: 2,
    id: "ast_parsing",
    badge: "Stage 02 // Syntax",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    title: "AST Parsing & Directed Call Graphing",
    shortDesc: "Extracts complete functions, classes, and call hierarchies across 6 programming languages.",
    icon: FileCode2,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    input: "Repository source code files (Python, TS/JS, Go, Rust, Java, C/C++)",
    process: "Tree-sitter native grammar parsers extract intact code units (classes, methods, parameters) and map caller-to-callee directed edges.",
    output: "Populated code_dependencies graph table and structured AST code chunks.",
    techStack: ["Tree-sitter Grammars", "PostgreSQL Directed Edges", "Celery Workers"],
    latencyMetric: "100,000 AST nodes / min"
  },
  {
    stepNumber: 3,
    id: "hybrid_rrf",
    badge: "Stage 03 // Search",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    title: "Tri-Signal Hybrid Search (RRF k=60)",
    shortDesc: "Matches requirements to code using vector embeddings, full-text keywords, and AST symbols.",
    icon: Sparkles,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    input: "Product requirement description or ticket acceptance criteria",
    process: "Queries 3 independent signals in parallel: Gemini 2.0 dense vector cosine, PostgreSQL tsvector keyword match, and exact AST symbol matches. Fuses rankings using Reciprocal Rank Fusion at k=60.",
    output: "Top candidate code units ranked with precision without second-stage LLM latency.",
    techStack: ["Google Gemini 2.0 (384d)", "pgvector HNSW", "tsvector BM25", "RRF Fusion"],
    latencyMetric: "< 15ms Sub-Second Search"
  },
  {
    stepNumber: 4,
    id: "blast_radius",
    badge: "Stage 04 // Graph Walk",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    title: "2-Hop Blast Radius Traversal",
    shortDesc: "Traverses upstream callers to predict downstream breaking changes before code is merged.",
    icon: Network,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    input: "PR modified file diffs and affected symbol names",
    process: "Recursive graph query over code_dependencies: Hop 1 discovers direct callers; Hop 2 discovers indirect transitive callers. Calculates overall risk severity.",
    output: "Exact list of all impacted downstream functions and risk rating (High, Medium, Low).",
    techStack: ["Recursive SQL CTEs", "code_dependencies Graph", "Transitive Caller Traversal"],
    latencyMetric: "2-Hop Traversal in < 25ms"
  },
  {
    stepNumber: 5,
    id: "delivery",
    badge: "Stage 05 // Delivery",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    title: "Autonomous Review & Jira Auto-Sync",
    shortDesc: "Generates structured reviews on GitHub PRs and executes 1-click status transitions in Jira.",
    icon: ShieldCheck,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
    input: "PR diff chunks + linked Jira specs + 2-hop blast radius callers",
    process: "LiteLLM routes prompt to Gemini 2.0/OpenAI with strict Pydantic schemas. Posts inline comments on GitHub PR and publishes ADF impact summary to Jira.",
    output: "Automated GitHub review comments, Check-run green/red status, and 1-click Jira transitions.",
    techStack: ["LiteLLM Routing", "Strict Pydantic JSON", "GitHub REST API", "Jira ADF REST v3"],
    latencyMetric: "Instant PR & Jira Sync"
  }
];

export function WorkingWorkflowVisual() {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const currentStep = WORKFLOW_STEPS[activeStepIndex];
  const StepIcon = currentStep.icon;

  return (
    <div className="my-8 rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
      
      {/* Visual Step Progress Header */}
      <div className="bg-slate-50/80 border-b border-slate-200/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              Interactive Execution Pipeline
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Step {activeStepIndex + 1} of {WORKFLOW_STEPS.length}
          </span>
        </div>

        {/* Step Navigation Pill Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {WORKFLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStepIndex === idx;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-slate-900 shadow-xs ring-2 ring-slate-900/10"
                    : "bg-white/60 border-slate-200/90 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                    0{step.stepNumber}
                  </span>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center ${step.iconBg} ${step.iconColor}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-[11px] font-bold text-slate-800 truncate">
                  {step.title.split("&")[0].split("(")[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Selected Step Walkthrough Card */}
      <div className="p-6 sm:p-8 space-y-6">
        
        {/* Step Title & Description Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-xl ${currentStep.iconBg} ${currentStep.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${currentStep.badgeColor}`}>
                  {currentStep.badge}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  // {currentStep.latencyMetric}
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-slate-900 mt-1">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                {currentStep.shortDesc}
              </p>
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            <button
              onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeStepIndex === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              &larr; Prev
            </button>
            <button
              onClick={() => setActiveStepIndex((prev) => Math.min(WORKFLOW_STEPS.length - 1, prev + 1))}
              disabled={activeStepIndex === WORKFLOW_STEPS.length - 1}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-mono font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        {/* Input -> Process -> Output Visual Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Input Box */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-slate-500 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>1. What Enters</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mb-1">Trigger Payload</div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {currentStep.input}
              </p>
            </div>
          </div>

          {/* Processing Box */}
          <div className="p-4 rounded-xl bg-violet-50/40 border border-violet-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-violet-700 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                <span>2. Engine Processing</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mb-1">Under The Hood</div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {currentStep.process}
              </p>
            </div>
          </div>

          {/* Output Box */}
          <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-emerald-700 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>3. What Is Produced</span>
              </div>
              <div className="text-xs font-bold text-slate-900 mb-1">Deterministic Output</div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {currentStep.output}
              </p>
            </div>
          </div>

        </div>

        {/* Technologies Employed Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Core Technologies:</span>
            <div className="flex flex-wrap gap-1.5">
              {currentStep.techStack.map((tech, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] border border-slate-200/60 font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Deterministic • Non-Blocking Execution</span>
          </div>
        </div>

      </div>

    </div>
  );
}
