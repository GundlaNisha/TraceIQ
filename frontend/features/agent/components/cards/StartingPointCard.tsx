"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, FileCode2, AlertTriangle, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import type { AgentApproval, StartingPointItem, ImpactSummary } from "../../types";

interface StartingPointCardProps {
  approval?: AgentApproval | null;
  startingPoints: StartingPointItem[];
  impactSummary?: ImpactSummary;
  onApprove: (feedback?: string) => Promise<void>;
  onReject: (feedback?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function StartingPointCard({
  approval,
  startingPoints,
  impactSummary,
  onApprove,
  onReject,
  isSubmitting,
}: StartingPointCardProps) {
  const [feedback, setFeedback] = useState("");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  const status = approval?.status || "pending";
  const isPending = status === "pending";

  const getRiskBadge = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className="my-4 rounded-xl border border-sky-500/30 bg-slate-900/80 p-5 backdrop-blur-md shadow-lg shadow-sky-500/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Suggested Starting Points</h4>
            <p className="text-xs text-slate-400">Human-in-the-Loop Confirmation Required</p>
          </div>
        </div>

        {/* Status Pill */}
        {!isPending && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              status === "approved"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            {status === "approved" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" /> Rejected
              </>
            )}
          </span>
        )}
      </div>

      {/* Starting Points List */}
      <div className="mt-4 space-y-2.5">
        {startingPoints.map((item, idx) => (
          <div
            key={idx}
            className="group rounded-lg border border-slate-800 bg-slate-950/60 p-3 transition hover:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode2 className="h-4 w-4 shrink-0 text-sky-400" />
                <span className="font-mono text-xs font-medium text-slate-200 truncate">
                  {item.file_path}
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                  L{item.line_start}–{item.line_end}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-sky-400">
                {Math.round(item.confidence * 100)}% match
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
              <span className="text-slate-300 font-medium">Symbol: <code className="text-sky-300 font-mono">{item.symbol_name}</code></span>
              {item.symbol_type && (
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{item.symbol_type}</span>
              )}
            </div>
            {item.reasoning && (
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.reasoning}</p>
            )}
          </div>
        ))}
      </div>

      {/* Impact Overview Badge */}
      {impactSummary && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
            <span>Estimated Blast Radius:</span>
            <span
              className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${getRiskBadge(
                impactSummary.risk_level
              )}`}
            >
              {impactSummary.risk_level}
            </span>
          </div>
          <span className="text-slate-400">
            {impactSummary.impacted_files_count} file(s) potentially affected
          </span>
        </div>
      )}

      {/* Action Controls (Only when pending) */}
      {isPending && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          {showFeedbackInput && (
            <div className="mb-3">
              <label className="mb-1 block text-xs text-slate-400">Feedback or revision instructions (optional):</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., Focus specifically on payment retry webhook logic instead..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                rows={2}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5">
            {!showFeedbackInput ? (
              <button
                type="button"
                onClick={() => setShowFeedbackInput(true)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Reject / Revise
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onReject(feedback)}
                disabled={isSubmitting}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition"
              >
                Submit Rejection
              </button>
            )}

            <button
              type="button"
              onClick={() => onApprove(feedback)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 transition shadow-sm disabled:opacity-50"
            >
              Confirm & Proceed
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
