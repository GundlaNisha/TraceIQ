"use client";

import { useState } from "react";
import {
  Layers,
  FileCode2,
  Activity,
  GitPullRequest,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { AgentSessionDetail, PRDraft } from "../types";

interface AgentContextInspectorProps {
  sessionDetail?: AgentSessionDetail | null;
  isOpen: boolean;
  onToggle: () => void;
}

type TabType = "requirement" | "code" | "impact" | "pr_draft";

export function AgentContextInspector({
  sessionDetail,
  isOpen,
  onToggle,
}: AgentContextInspectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>("requirement");
  const [copied, setCopied] = useState(false);

  const contextData = sessionDetail?.session.context_metadata || {};
  const startingPoints = contextData.starting_points || [];
  const impactSummary = contextData.impact_summary;
  const prDraft: PRDraft | undefined = contextData.pr_draft;

  const handleCopyMarkdown = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 rounded-l-xl border border-r-0 border-slate-800 bg-slate-900/90 p-2.5 text-slate-400 shadow-xl backdrop-blur-md hover:text-white transition z-20"
        title="Open Context & Artifact Inspector"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex h-full w-80 md:w-96 flex-col border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl">
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Context & Artifact Inspector
        </h3>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50">
        <button
          type="button"
          onClick={() => setActiveTab("requirement")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition border-b-2 ${
            activeTab === "requirement"
              ? "border-sky-500 text-sky-400 bg-sky-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Story</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("code")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition border-b-2 ${
            activeTab === "code"
              ? "border-sky-500 text-sky-400 bg-sky-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCode2 className="h-3.5 w-3.5" />
          <span>Code</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("impact")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition border-b-2 ${
            activeTab === "impact"
              ? "border-sky-500 text-sky-400 bg-sky-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Impact</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pr_draft")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition border-b-2 ${
            activeTab === "pr_draft"
              ? "border-sky-500 text-sky-400 bg-sky-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitPullRequest className="h-3.5 w-3.5" />
          <span>PR</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: Requirement Context */}
        {activeTab === "requirement" && (
          <div className="space-y-3.5 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Active Requirement
              </span>
              <p className="font-semibold text-slate-200 mt-1">
                {sessionDetail?.session.requirement_id ? `ID: ${sessionDetail.session.requirement_id}` : "No specific requirement linked"}
              </p>
              <p className="text-slate-400 mt-2 leading-relaxed">
                Requirements provide grounding for automated AST symbol exploration and PR linkage.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Code Explorer */}
        {activeTab === "code" && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Suggested Files ({startingPoints.length})</span>
            </div>

            {startingPoints.length === 0 ? (
              <p className="text-slate-500 italic">No starting points recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {startingPoints.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-200 truncate">{item.file_path}</span>
                      <span className="text-[10px] text-sky-400">{Math.round(item.confidence * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <span>Symbol:</span>
                      <code className="text-sky-300 font-mono">{item.symbol_name}</code>
                      <span className="text-slate-500">(L{item.line_start}–{item.line_end})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Blast Radius Graph / Summary */}
        {activeTab === "impact" && (
          <div className="space-y-3 text-xs">
            {!impactSummary ? (
              <p className="text-slate-500 italic">Blast radius calculation not run yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Risk Assessment</span>
                    <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                      {impactSummary.risk_level || "Medium"}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-300">
                    {impactSummary.impacted_files_count || 0} potentially impacted files detected across downstream AST dependencies.
                  </p>
                </div>

                {impactSummary.downstream_routes && impactSummary.downstream_routes.length > 0 && (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Affected Routes</span>
                    <div className="mt-1.5 space-y-1">
                      {impactSummary.downstream_routes.map((route: string, i: number) => (
                        <div key={i} className="font-mono text-[11px] text-slate-300 bg-slate-950/60 px-2 py-1 rounded">
                          {route}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: PR Draft Preview */}
        {activeTab === "pr_draft" && (
          <div className="space-y-3 text-xs">
            {!prDraft ? (
              <p className="text-slate-500 italic">No PR description draft generated yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">PR Markdown Draft</span>
                  <button
                    type="button"
                    onClick={() => handleCopyMarkdown(prDraft.raw_markdown)}
                    className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-slate-300 prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown>{prDraft.raw_markdown}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
