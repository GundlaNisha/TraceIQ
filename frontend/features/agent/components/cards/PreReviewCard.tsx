"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, AlertCircle, TestTube2, ArrowRight } from "lucide-react";
import type { AgentApproval, ReviewFinding, TestGapItem } from "../../types";

interface PreReviewCardProps {
  approval?: AgentApproval | null;
  reviewFindings: ReviewFinding[];
  testGaps: TestGapItem[];
  onApprove: (feedback?: string) => Promise<void>;
  onReject: (feedback?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function PreReviewCard({
  approval,
  reviewFindings,
  testGaps,
  onApprove,
  onReject,
  isSubmitting,
}: PreReviewCardProps) {
  const [feedback, setFeedback] = useState("");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  const status = approval?.status || "pending";
  const isPending = status === "pending";

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="my-4 rounded-xl border border-indigo-500/30 bg-slate-900/80 p-5 backdrop-blur-md shadow-lg shadow-indigo-500/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Coding Standards & Test Gap Audit</h4>
            <p className="text-xs text-slate-400">Review automated static analysis before PR synthesis</p>
          </div>
        </div>

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
                <CheckCircle2 className="h-3.5 w-3.5" /> Approved
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" /> Rejected
              </>
            )}
          </span>
        )}
      </div>

      {/* Review Findings */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-indigo-400" />
            Standards & Security Findings ({reviewFindings.length})
          </span>
        </div>

        {reviewFindings.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No standards violations detected.</p>
        ) : (
          <div className="space-y-2">
            {reviewFindings.map((finding, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${getSeverityBadge(
                        finding.severity
                      )}`}
                    >
                      {finding.severity}
                    </span>
                    <span className="font-mono text-slate-300 truncate">
                      {finding.file_path}
                      {finding.line_number ? `:L${finding.line_number}` : ""}
                    </span>
                  </div>
                  {finding.rule_id && (
                    <span className="font-mono text-[10px] text-slate-500">{finding.rule_id}</span>
                  )}
                </div>
                <p className="mt-1.5 text-slate-300">{finding.message}</p>
                {finding.recommendation && (
                  <p className="mt-1 text-[11px] text-sky-400/90 font-mono bg-sky-950/20 rounded p-1.5 border border-sky-900/30">
                    💡 Recommendation: {finding.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing Test Gaps */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1.5">
            <TestTube2 className="h-3.5 w-3.5 text-amber-400" />
            Missing Unit Test Coverage ({testGaps.length})
          </span>
        </div>

        {testGaps.length === 0 ? (
          <p className="text-xs text-slate-500 italic">All modified files have associated unit test suites.</p>
        ) : (
          <div className="space-y-2">
            {testGaps.map((gap, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-xs"
              >
                <div>
                  <span className="font-mono font-medium text-slate-300">{gap.file_path}</span>
                  <p className="mt-0.5 text-[11px] text-amber-400/90">{gap.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Controls */}
      {isPending && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          {showFeedbackInput && (
            <div className="mb-3">
              <label className="mb-1 block text-xs text-slate-400">Revision or omission notes:</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., Suppress rule STD-AUTH-001 for internal webhook endpoint..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm disabled:opacity-50"
            >
              Generate PR Draft
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
