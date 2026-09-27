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
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="my-4 rounded-2xl border border-border/80 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-accent border border-blue-100">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-serif text-foreground tracking-tight">
              Coding Standards & Test Gap Audit
            </h4>
            <p className="text-xs text-muted-foreground">
              Review automated static analysis before PR synthesis
            </p>
          </div>
        </div>

        {!isPending && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              status === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
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
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
            Standards & Security Findings ({reviewFindings.length})
          </span>
        </div>

        {reviewFindings.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No standards violations detected.</p>
        ) : (
          <div className="space-y-2">
            {reviewFindings.map((finding, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border/60 bg-[#FAF8F5]/80 p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getSeverityBadge(
                        finding.severity
                      )}`}
                    >
                      {finding.severity}
                    </span>
                    <span className="font-mono font-medium text-foreground truncate">
                      {finding.file_path}
                      {finding.line_number ? `:L${finding.line_number}` : ""}
                    </span>
                  </div>
                  {finding.rule_id && (
                    <span className="font-mono text-[10px] text-muted-foreground">{finding.rule_id}</span>
                  )}
                </div>
                <p className="text-muted-foreground">{finding.message}</p>
                {finding.recommendation && (
                  <p className="mt-1 text-[11px] text-blue-700 font-mono bg-blue-50/70 rounded-lg p-2 border border-blue-200/60">
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
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <span className="flex items-center gap-1.5">
            <TestTube2 className="h-3.5 w-3.5 text-amber-600" />
            Missing Unit Test Coverage ({testGaps.length})
          </span>
        </div>

        {testGaps.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">All modified files have associated unit test suites.</p>
        ) : (
          <div className="space-y-2">
            {testGaps.map((gap, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between rounded-xl border border-border/60 bg-[#FAF8F5]/80 p-3 text-xs"
              >
                <div>
                  <span className="font-mono font-medium text-foreground">{gap.file_path}</span>
                  <p className="mt-0.5 text-[11px] text-amber-700">{gap.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Controls */}
      {isPending && (
        <div className="mt-5 border-t border-border/60 pt-4">
          {showFeedbackInput && (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Revision or omission notes:</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., Suppress rule STD-AUTH-001 for internal webhook endpoint..."
                className="w-full rounded-xl border border-border bg-white p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
                className="rounded-xl border border-border/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-slate-50 transition"
              >
                Reject / Revise
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onReject(feedback)}
                disabled={isSubmitting}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
              >
                Submit Rejection
              </button>
            )}

            <button
              type="button"
              onClick={() => onApprove(feedback)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 transition shadow-xs disabled:opacity-50"
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
