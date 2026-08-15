"use client";
import { usePRReviews } from "../api/queries";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { GitPullRequest, Sparkles, Clock, CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";
import type { PRReview } from "@/lib/types/pr-review";

const STATUS_CONFIG = {
  queued: { label: "Queued", icon: Clock, className: "bg-slate-100 text-slate-600" },
  running: { label: "Analyzing…", icon: Loader2, className: "bg-blue-50 text-blue-600 animate-pulse" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", icon: XCircle, className: "bg-rose-50 text-rose-600" },
} as const;

export function PRReviewList() {
  const { data: reviews, isLoading, isError } = usePRReviews();

  if (isLoading) {
    return (
      <div className="py-24 text-center text-muted animate-pulse">
        <Sparkles className="w-8 h-8 text-border mx-auto mb-4" />
        <p>Loading reviews…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16 text-center text-rose-500 bg-rose-50 rounded-2xl border border-rose-100">
        Failed to load PR reviews. Please try again.
      </div>
    );
  }

  if (!reviews?.length) {
    return (
      <div className="py-24 text-center bg-white/50 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-accent" />
        </div>
        <div>
          <p className="text-foreground text-lg font-semibold">No PR reviews yet</p>
          <p className="text-sm text-muted mt-1">Go to the Pull Requests page and click <strong>"Review PR"</strong> to start.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review: PRReview) => {
        const statusKey = review.status as keyof typeof STATUS_CONFIG;
        const { label, icon: Icon, className } = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.queued;

        return (
          <Link
            key={review.id}
            href={`/pr-reviews/${review.id}`}
            className="flex items-start gap-5 p-5 bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
          >
            <div className="hidden md:flex shrink-0 pt-0.5">
              <GitPullRequest className="w-6 h-6 text-accent/60" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground truncate">{review.pr_title}</h3>
              <p className="text-sm text-muted-foreground mt-1">PR #{review.pr_number}</p>

              {review.summary && (
                <p className="text-sm text-muted mt-2 line-clamp-2">{review.summary}</p>
              )}

              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
