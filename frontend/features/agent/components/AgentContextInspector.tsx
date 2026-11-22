"use client";

import { useState } from "react";
import {
  Layers,
  FileCode2,
  Activity,
  GitPullRequest,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { AgentMarkdown } from "./AgentMarkdown";
import type { AgentSessionDetail, PRDraft } from "../types";

interface AgentContextInspectorProps {
  sessionDetail?: AgentSessionDetail | null;
  requirementTitle?: string;
  jiraKey?: string;
  isOpen: boolean;
  onToggle: () => void;
}

type TabType = "requirement" | "code" | "impact" | "pr_draft";

export function AgentContextInspector({
  sessionDetail,
  requirementTitle,
  jiraKey,
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
        className="fixed right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-l-xl border border-r-0 border-border/80 bg-white/95 px-2.5 py-2.5 text-muted-foreground shadow-md backdrop-blur-md hover:text-accent hover:bg-white transition-all z-20 group cursor-pointer"
        title="Open Context & Artifact Inspector"
      >
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition" />
        <div className="flex flex-col items-start text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
            Inspector
          </span>
          {startingPoints.length > 0 && (
            <span className="text-[9.5px] text-emerald-600 font-semibold">
              {startingPoints.length} files
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-72 md:w-80 flex-col border-l border-border/60 bg-white/95 backdrop-blur-xl shadow-xs overflow-hidden shrink-0 transition-all duration-300">
      {/* Compact Inspector Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2.5 shrink-0 bg-[#FAF8F5]/50">
        <div className="flex items-center gap-1.5">
          <div className="rounded-md bg-accent/10 p-1 text-accent">
            <Sparkles className="h-3 w-3" />
          </div>
          <h3 className="text-[11px] font-bold font-serif uppercase tracking-wider text-foreground">
            Context Inspector
          </h3>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition cursor-pointer"
          title="Collapse Inspector"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Compact Tabs */}
      <div className="flex border-b border-border/60 bg-[#FAF8F5]/80 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("requirement")}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-semibold transition border-b-2 cursor-pointer ${
            activeTab === "requirement"
              ? "border-accent text-accent bg-white shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-3 w-3" />
          <span>Story</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("code")}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-semibold transition border-b-2 cursor-pointer ${
            activeTab === "code"
              ? "border-accent text-accent bg-white shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCode2 className="h-3 w-3" />
          <span>Code {startingPoints.length > 0 && `(${startingPoints.length})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("impact")}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-semibold transition border-b-2 cursor-pointer ${
            activeTab === "impact"
              ? "border-accent text-accent bg-white shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-3 w-3" />
          <span>Impact</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pr_draft")}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-semibold transition border-b-2 cursor-pointer ${
            activeTab === "pr_draft"
              ? "border-accent text-accent bg-white shadow-2xs"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <GitPullRequest className="h-3 w-3" />
          <span>PR</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* Tab 1: Requirement Context */}
        {activeTab === "requirement" && (
          <div className="space-y-2.5 text-xs">
            <div className="rounded-xl border border-border/70 bg-[#FAF8F5]/80 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Requirement
                </span>
                {jiraKey && (
                  <span className="rounded bg-purple-100 border border-purple-200 px-1 py-0.5 text-[9.5px] font-mono font-semibold text-purple-700">
                    {jiraKey}
                  </span>
                )}
              </div>

              <p className="font-serif font-bold text-xs text-foreground">
                {requirementTitle || (sessionDetail?.session.requirement_id ? `ID: ${sessionDetail.session.requirement_id.slice(0, 10)}...` : "No requirement linked")}
              </p>

              <p className="text-muted-foreground text-[11px] leading-relaxed pt-1 border-t border-border/50">
                Grounds AST symbol exploration, blast radius calculations, and PR verification.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Code Explorer */}
        {activeTab === "code" && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
              <span>Suggested Files ({startingPoints.length})</span>
            </div>

            {startingPoints.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-4 text-center text-muted-foreground">
                <FileCode2 className="h-4 w-4 mx-auto mb-1.5 opacity-40" />
                <p className="text-[11px] italic">No starting points recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {startingPoints.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/70 bg-[#FAF8F5]/80 p-2.5 space-y-1 hover:bg-white hover:border-accent/30 transition shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-foreground font-semibold truncate text-[10.5px]">
                        {item.file_path}
                      </span>
                      <span className="text-[9.5px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200 shrink-0">
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground text-[10.5px]">
                      <span>Symbol:</span>
                      <code className="text-accent font-mono font-semibold bg-white px-1 py-0.2 rounded border border-border/60">
                        {item.symbol_name}
                      </code>
                      <span className="text-muted-foreground">(L{item.line_start}–{item.line_end})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Blast Radius Summary */}
        {activeTab === "impact" && (
          <div className="space-y-2 text-xs">
            {!impactSummary ? (
              <div className="rounded-xl border border-dashed border-border/80 p-4 text-center text-muted-foreground">
                <Activity className="h-4 w-4 mx-auto mb-1.5 opacity-40" />
                <p className="text-[11px] italic">Blast radius not calculated yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-xl border border-border/70 bg-[#FAF8F5]/80 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px] font-medium">Risk Assessment</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase border ${
                      impactSummary.risk_level?.toLowerCase() === "high" || impactSummary.risk_level?.toLowerCase() === "critical"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : impactSummary.risk_level?.toLowerCase() === "medium"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {impactSummary.risk_level || "Medium"}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-foreground leading-relaxed">
                    <strong>{impactSummary.impacted_files_count || 0}</strong> impacted files across downstream AST dependencies.
                  </p>
                </div>

                {impactSummary.downstream_routes && impactSummary.downstream_routes.length > 0 && (
                  <div className="rounded-xl border border-border/70 bg-[#FAF8F5]/50 p-2.5 space-y-1.5">
                    <span className="text-[9.5px] uppercase font-bold text-muted-foreground">
                      Affected Routes
                    </span>
                    <div className="space-y-1">
                      {impactSummary.downstream_routes.map((route: string, i: number) => (
                        <div
                          key={i}
                          className="font-mono text-[10.5px] text-foreground bg-white px-2 py-0.5 rounded border border-border/60"
                        >
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
          <div className="space-y-2 text-xs">
            {!prDraft ? (
              <div className="rounded-xl border border-dashed border-border/80 p-4 text-center text-muted-foreground">
                <GitPullRequest className="h-4 w-4 mx-auto mb-1.5 opacity-40" />
                <p className="text-[11px] italic">No PR description generated yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-xs text-foreground">PR Draft</span>
                  <button
                    type="button"
                    onClick={() => handleCopyMarkdown(prDraft.raw_markdown)}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-0.5 text-[10.5px] font-semibold text-white hover:bg-accent/90 cursor-pointer shadow-2xs"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="rounded-lg border border-border/70 bg-[#FAF8F5]/50 p-3 text-foreground prose prose-slate prose-xs max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground">
                  <AgentMarkdown content={prDraft.raw_markdown} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
