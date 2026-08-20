"use client";
import { useEffect, useState } from "react";
import { usePRReview, usePRReviewFindings, usePublishPRComment } from "../api/queries";
import {
  CheckCircle2, XCircle, Clock, Loader2, ExternalLink,
  AlertTriangle, AlertCircle, Info, Sparkles, GitPullRequest, ArrowLeft,
  MessageSquarePlus, Check,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/utils";
import type { PRReviewFinding } from "@/lib/types/pr-review";

const STATUS_CONFIG = {
  queued: { label: "Queued", icon: Clock, bar: "bg-slate-300", text: "text-slate-600" },
  running: { label: "Analyzing…", icon: Loader2, bar: "bg-blue-400 animate-pulse", text: "text-blue-600" },
  completed: { label: "Review Complete", icon: CheckCircle2, bar: "bg-emerald-500", text: "text-emerald-700" },
  failed: { label: "Failed", icon: XCircle, bar: "bg-rose-400", text: "text-rose-600" },
} as const;

const SEVERITY_CONFIG = {
  high: { label: "High", icon: AlertTriangle, bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-100 text-rose-700" },
  medium: { label: "Medium", icon: AlertCircle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  low: { label: "Low", icon: Info, bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", badge: "bg-slate-100 text-slate-600" },
} as const;

interface Props { reviewId: string; }

export function PRReviewDetail({ reviewId }: Props) {
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const { data: review, isLoading: reviewLoading } = usePRReview(reviewId);
  const isActive = review?.status === "queued" || review?.status === "running";
  const { data: findings, isLoading: findingsLoading, refetch: refetchFindings } = usePRReviewFindings(reviewId, isActive);
  const { mutate: publishComment, isPending: isPublishing } = usePublishPRComment();

  useEffect(() => {
    if (review?.status === "completed" || review?.status === "failed") {
      refetchFindings();
    }
  }, [review?.status, refetchFindings]);

  if (reviewLoading || !review) {
    return (
      <div className="py-24 text-center animate-pulse text-muted">
        <Sparkles className="w-8 h-8 mx-auto mb-4 text-border" />
        <p>Loading review…</p>
      </div>
    );
  }

  const statusKey = review.status as keyof typeof STATUS_CONFIG;
  const { label: statusLabel, icon: StatusIcon, text: statusText } = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.queued;

  const sortedFindings = [...(findings ?? [])].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3);
  });

  const highCount = sortedFindings.filter((f) => f.severity === "high").length;
  const mediumCount = sortedFindings.filter((f) => f.severity === "medium").length;
  const lowCount = sortedFindings.filter((f) => f.severity === "low").length;

  const handlePostComment = () => {
    setCommentError(null);
    setCommentSuccess(null);
    publishComment(reviewId, {
      onSuccess: (data) => {
        setCommentSuccess(data.message || "Review comment successfully posted to GitHub PR!");
        setTimeout(() => setCommentSuccess(null), 6000);
      },
      onError: (err: any) => {
        setCommentError(err.message || "Failed to post comment to GitHub");
      },
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Back nav */}
      <Link href="/pr-reviews" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to PR Reviews
      </Link>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <GitPullRequest className="w-6 h-6 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">PR #{review.pr_number}</p>
              <h1 className="text-2xl font-semibold font-serif text-foreground tracking-tight">{review.pr_title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${statusText}`}>
                  <StatusIcon className={`w-4 h-4 ${isActive ? "animate-spin" : ""}`} />
                  {statusLabel}
                </span>
                <span className="text-muted text-xs">&middot;</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(review.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {review.status === "completed" && (
              <Button
                type="button"
                onClick={handlePostComment}
                disabled={isPublishing}
                className="gap-2 shadow-sm font-semibold"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : commentSuccess ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <MessageSquarePlus className="w-4 h-4" />
                )}
                {isPublishing
                  ? "Commenting on GitHub…"
                  : commentSuccess
                  ? "Posted to GitHub!"
                  : "Add PR Comment"}
              </Button>
            )}

            <a
              href={review.pr_html_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-foreground transition-colors shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>

        {commentSuccess && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {commentSuccess}
            </span>
            <a
              href={review.pr_html_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-700 underline hover:no-underline shrink-0"
            >
              Open PR Conversation →
            </a>
          </div>
        )}

        {commentError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 font-medium animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{commentError}</span>
          </div>
        )}
      </div>

      {isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
          <div>
            <p className="font-semibold text-blue-700 text-sm">AI Review In Progress</p>
            <p className="text-blue-600/80 text-xs mt-0.5">TraceIQ is fetching the PR diff and analyzing it. This page will auto-refresh.</p>
          </div>
        </div>
      )}

      {review.status === "completed" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Summary */}
          {review.summary && (
            <div className="md:col-span-2 bg-white/80 border border-border/50 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-semibold text-foreground">AI Summary</h2>
              </div>
              <p className="text-muted leading-relaxed">{review.summary}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            {[
              { count: highCount, label: "High", color: "text-rose-600", bg: "bg-rose-50 border-rose-100" },
              { count: mediumCount, label: "Medium", color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
              { count: lowCount, label: "Low", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
            ].map(({ count, label, color, bg }) => (
              <div key={label} className={`rounded-2xl border p-4 text-center ${bg}`}>
                <p className={`text-3xl font-bold ${color}`}>{count}</p>
                <p className="text-xs font-semibold text-muted mt-1">{label} Severity</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      {sortedFindings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold font-serif text-foreground mb-4">
            Findings <span className="text-muted font-normal text-lg">({sortedFindings.length})</span>
          </h2>
          <div className="flex flex-col gap-3">
            {sortedFindings.map((finding: PRReviewFinding) => {
              const sev = (finding.severity as keyof typeof SEVERITY_CONFIG) in SEVERITY_CONFIG
                ? finding.severity as keyof typeof SEVERITY_CONFIG
                : "low";
              const { icon: SeverityIcon, bg, border, badge } = SEVERITY_CONFIG[sev];

              return (
                <div
                  key={finding.id}
                  className={`rounded-2xl border p-5 ${bg} ${border}`}
                >
                  <div className="flex items-start gap-3">
                    <SeverityIcon className={`w-4 h-4 mt-0.5 shrink-0 ${SEVERITY_CONFIG[sev].text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${badge}`}>
                          {finding.severity}
                        </span>
                        <code className="text-xs font-mono text-muted-foreground truncate">
                          {finding.file_path}
                          {finding.line_number ? `:${finding.line_number}` : ""}
                        </code>
                      </div>
                      <p className={`text-sm leading-relaxed ${SEVERITY_CONFIG[sev].text}`}>{finding.message}</p>
                      {finding.requirement_gap && (
                        <div className="mt-3 pl-3 border-l-2 border-current/30">
                          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Requirement Gap</p>
                          <p className="text-sm italic opacity-80">{finding.requirement_gap}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {review.status === "completed" && findingsLoading && sortedFindings.length === 0 && (
        <div className="py-12 text-center text-muted animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
          <p className="text-sm">Loading review findings…</p>
        </div>
      )}

      {review.status === "completed" && !findingsLoading && findings !== undefined && sortedFindings.length === 0 && (
        <div className="py-16 text-center bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          <p className="font-semibold text-emerald-700 text-lg">All clear! No issues found.</p>
          <p className="text-sm text-emerald-600/80">The AI found no bugs, security issues, or requirement gaps in this PR.</p>
        </div>
      )}

      {review.status === "failed" && (
        <div className="py-16 text-center bg-rose-50 rounded-2xl border border-rose-100 flex flex-col items-center gap-3">
          <XCircle className="w-10 h-10 text-rose-400" />
          <p className="font-semibold text-rose-700 text-lg">Review failed</p>
          <p className="text-sm text-rose-600/80">Something went wrong while analyzing this PR. Check the backend logs for details.</p>
        </div>
      )}
    </div>
  );
}
