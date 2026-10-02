"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, FileCode2, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
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
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className="my-4 rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-accent/10 p-2 text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Suggested Starting Points</h4>
            <p className="text-xs text-muted-foreground">Human-in-the-Loop Confirmation Required</p>
          </div>
        </div>

        {/* Status Pill */}
        {!isPending && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              status === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {status === "approved" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Confirmed
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-rose-600" /> Rejected
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
            className="group rounded-xl border border-border/70 bg-[#FBF9F5] p-3.5 transition hover:border-accent/30 hover:bg-white hover:shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode2 className="h-4 w-4 shrink-0 text-accent" />
                <span className="font-mono text-xs font-semibold text-foreground truncate">
                  {item.file_path}
                </span>
                <span className="rounded-md bg-white border border-border/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  L{item.line_start}–{item.line_end}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                {Math.round(item.confidence * 100)}% match
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-foreground font-medium">
                Symbol: <code className="bg-white border border-border/80 px-1.5 py-0.5 rounded text-accent font-mono text-xs font-semibold">{item.symbol_name}</code>
              </span>
              {item.symbol_type && (
                <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">{item.symbol_type}</span>
              )}
            </div>
            {item.reasoning && (
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.reasoning}</p>
            )}
          </div>
        ))}
      </div>

      {/* Impact Overview Badge */}
      {impactSummary && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 bg-[#F8F6F2] px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Estimated Blast Radius:</span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${getRiskBadge(
                impactSummary.risk_level
              )}`}
            >
              {impactSummary.risk_level}
            </span>
          </div>
          <span className="text-muted-foreground font-medium">
            {impactSummary.impacted_files_count} file(s) potentially affected
          </span>
        </div>
      )}

      {/* Action Controls (Only when pending) */}
      {isPending && (
        <div className="mt-5 border-t border-border/60 pt-4">
          {showFeedbackInput && (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-foreground">Feedback or revision instructions (optional):</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., Focus specifically on payment retry webhook logic instead..."
                className="w-full rounded-xl border border-border bg-[#FBF9F5] p-2.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent/20 transition"
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
                className="rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-slate-50 hover:text-foreground transition shadow-2xs"
              >
                Reject / Revise
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onReject(feedback)}
                disabled={isSubmitting}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
              >
                Submit Rejection
              </button>
            )}

            <button
              type="button"
              onClick={() => onApprove(feedback)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition shadow-sm disabled:opacity-50"
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
