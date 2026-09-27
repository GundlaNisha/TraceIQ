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
        className="fixed right-0 top-1/2 -translate-y-1/2 rounded-l-xl border border-r-0 border-border/80 bg-white/95 p-2.5 text-muted-foreground shadow-lg backdrop-blur-md hover:text-accent transition z-20"
        title="Open Context & Artifact Inspector"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-80 md:w-96 flex-col border-l border-border/60 bg-white/95 backdrop-blur-xl shadow-xs overflow-hidden">
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5 shrink-0">
        <h3 className="text-xs font-bold font-serif uppercase tracking-wider text-foreground">
          Context & Artifact Inspector
        </h3>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 bg-[#FAF8F5]/80 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("requirement")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2 ${
            activeTab === "requirement"
              ? "border-accent text-accent bg-white"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Story</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("code")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2 ${
            activeTab === "code"
              ? "border-accent text-accent bg-white"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCode2 className="h-3.5 w-3.5" />
          <span>Code</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("impact")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2 ${
            activeTab === "impact"
              ? "border-accent text-accent bg-white"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Impact</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pr_draft")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition border-b-2 ${
            activeTab === "pr_draft"
              ? "border-accent text-accent bg-white"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <GitPullRequest className="h-3.5 w-3.5" />
          <span>PR</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: Requirement Context */}
        {activeTab === "requirement" && (
          <div className="space-y-3.5 text-xs">
            <div className="rounded-xl border border-border/60 bg-[#FAF8F5]/80 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Requirement
              </span>
              <p className="font-serif font-bold text-foreground mt-1">
                {sessionDetail?.session.requirement_id ? `ID: ${sessionDetail.session.requirement_id}` : "No specific requirement linked"}
              </p>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                Requirements provide grounding for automated AST symbol exploration and PR linkage.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Code Explorer */}
        {activeTab === "code" && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-muted-foreground font-medium">
              <span>Suggested Files ({startingPoints.length})</span>
            </div>

            {startingPoints.length === 0 ? (
              <p className="text-muted-foreground italic">No starting points recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {startingPoints.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/60 bg-[#FAF8F5]/80 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-foreground font-medium truncate">{item.file_path}</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">{Math.round(item.confidence * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                      <span>Symbol:</span>
                      <code className="text-accent font-mono font-semibold">{item.symbol_name}</code>
                      <span className="text-muted-foreground">(L{item.line_start}–{item.line_end})</span>
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
              <p className="text-muted-foreground italic">Blast radius calculation not run yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-[#FAF8F5]/80 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Risk Assessment</span>
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                      {impactSummary.risk_level || "Medium"}
                    </span>
                  </div>
                  <p className="mt-2 text-foreground">
                    {impactSummary.impacted_files_count || 0} potentially impacted files detected across downstream AST dependencies.
                  </p>
                </div>

                {impactSummary.downstream_routes && impactSummary.downstream_routes.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-[#FAF8F5]/50 p-3">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Affected Routes</span>
                    <div className="mt-1.5 space-y-1">
                      {impactSummary.downstream_routes.map((route: string, i: number) => (
                        <div key={i} className="font-mono text-[11px] text-foreground bg-white px-2 py-1 rounded border border-border/60">
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
              <p className="text-muted-foreground italic">No PR description draft generated yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-foreground">PR Markdown Draft</span>
                  <button
                    type="button"
                    onClick={() => handleCopyMarkdown(prDraft.raw_markdown)}
                    className="inline-flex items-center gap-1 rounded-xl bg-accent px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-accent/90"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="rounded-xl border border-border/60 bg-[#FAF8F5]/50 p-3.5 text-foreground prose prose-slate prose-xs max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground prose-code:text-accent prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
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
