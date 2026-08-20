"use client";
import { useState } from "react";
import { usePullRequests } from "../api/queries";
import { usePRReviews, usePublishPRComment } from "@/features/pr-reviews/api/queries";
import { GitPullRequest, GitMerge, XCircle, Clock, ExternalLink, Sparkles, CheckCircle2, RotateCw, MessageSquarePlus, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ReviewPRModal } from "@/features/pr-reviews/components/ReviewPRModal";
import Link from "next/link";
import type { GitHubPullRequest } from "@/lib/types/github";

export function PullRequestList() {
  const { data: prs, isLoading, isError } = usePullRequests();
  const { data: prReviews } = usePRReviews();
  const [reviewingPR, setReviewingPR] = useState<GitHubPullRequest | null>(null);
  const { mutate: publishComment } = usePublishPRComment();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<{ id: string; message: string } | null>(null);

  const handlePublishComment = (reviewId: string) => {
    setPublishingId(reviewId);
    setPublishError(null);
    publishComment(reviewId, {
      onSuccess: () => {
        setPublishingId(null);
        setPublishedId(reviewId);
        setTimeout(() => setPublishedId(null), 5000);
      },
      onError: (err: any) => {
        setPublishingId(null);
        setPublishError({ id: reviewId, message: err.message || "Failed to post comment to GitHub" });
        setTimeout(() => setPublishError(null), 6000);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-muted">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <GitPullRequest className="w-8 h-8 text-border" />
          <p>Fetching active pull requests from GitHub...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-24 text-center text-rose-500 bg-rose-50 rounded-2xl border border-rose-100">
        Failed to fetch pull requests. Ensure your GitHub account is connected in the Repositories tab.
      </div>
    );
  }

  if (!prs?.length) {
    return (
      <div className="py-24 text-center bg-white/50 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center gap-3">
        <GitPullRequest className="w-10 h-10 text-muted/30" />
        <p className="text-muted text-lg font-medium">No open pull requests found.</p>
        <p className="text-sm text-muted-foreground">When you open a PR on your tracked repositories, it will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {prs.map((pr) => {
          const matchingReview = prReviews?.find(
            (r) =>
              r.pr_number === pr.number &&
              ((r.pr_html_url &&
                pr.html_url &&
                r.pr_html_url.replace(/\/$/, "") ===
                  pr.html_url.replace(/\/$/, "")) ||
                r.pr_title === pr.title)
          );

          return (
            <div
              key={pr.id}
              className="group flex flex-col md:flex-row gap-5 p-5 bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
            >
              {/* Status Icon */}
              <div className="hidden md:flex shrink-0 pt-1">
                {pr.state === "open" && !pr.draft && <GitPullRequest className="w-6 h-6 text-emerald-500" />}
                {pr.state === "open" && pr.draft && <GitPullRequest className="w-6 h-6 text-slate-400" />}
                {pr.state === "merged" && <GitMerge className="w-6 h-6 text-purple-500" />}
                {pr.state === "closed" && <XCircle className="w-6 h-6 text-rose-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                    {pr.repository_name}
                  </span>
                  <span className="text-sm font-medium text-muted">#{pr.number}</span>
                  {pr.draft && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                      Draft
                    </span>
                  )}
                  {matchingReview && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        matchingReview.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          : matchingReview.status === "failed"
                            ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                            : "bg-blue-50 text-blue-700 border border-blue-200/60"
                      }`}
                    >
                      {matchingReview.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                      {matchingReview.status === "running" && <RotateCw className="w-3 h-3 animate-spin" />}
                      {matchingReview.status === "completed"
                        ? "AI Review Ready"
                        : matchingReview.status === "running"
                          ? "AI Reviewing..."
                          : matchingReview.status === "queued"
                            ? "Review Queued"
                            : "Review Failed"}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-foreground">
                  {pr.title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {pr.user.avatar_url ? (
                      <img src={pr.user.avatar_url} alt={pr.user.login} className="w-5 h-5 rounded-full ring-2 ring-white" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-200" />
                    )}
                    <span className="font-medium text-foreground">{pr.user.login}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Updated {formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {matchingReview ? (
                    <>
                      <Link href={`/pr-reviews/${matchingReview.id}`}>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-accent text-white hover:bg-accent/90 font-semibold text-xs shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          View AI Review
                        </Button>
                      </Link>
                      {matchingReview.status === "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-accent/30 text-foreground hover:bg-accent/10 text-xs font-semibold"
                          onClick={() => handlePublishComment(matchingReview.id)}
                          disabled={publishingId === matchingReview.id}
                          title="Comment this review content directly on the GitHub PR"
                        >
                          {publishingId === matchingReview.id ? (
                            <RotateCw className="w-3 h-3 animate-spin text-accent" />
                          ) : publishedId === matchingReview.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <MessageSquarePlus className="w-3 h-3 text-accent" />
                          )}
                          {publishingId === matchingReview.id
                            ? "Commenting…"
                            : publishedId === matchingReview.id
                            ? "Commented!"
                            : "Add PR Comment"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-border text-muted hover:text-foreground text-xs"
                        onClick={() => setReviewingPR(pr)}
                        disabled={
                          matchingReview.status === "queued" ||
                          matchingReview.status === "running"
                        }
                        title={
                          matchingReview.status === "queued" ||
                          matchingReview.status === "running"
                            ? "Review in progress"
                            : "Re-run Review"
                        }
                      >
                        <RotateCw
                          className={`w-3 h-3 ${
                            matchingReview.status === "running"
                              ? "animate-spin"
                              : ""
                          }`}
                        />
                        {matchingReview.status === "running"
                          ? "Reviewing…"
                          : "Re-review"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-accent/20 text-accent hover:bg-accent/5 hover:border-accent/40 font-semibold text-xs"
                      onClick={() => setReviewingPR(pr)}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Review PR
                    </Button>
                  )}

                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition-colors"
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {publishError && matchingReview && publishError.id === matchingReview.id && (
                  <p className="text-xs text-rose-600 font-medium text-right">
                    {publishError.message}
                  </p>
                )}
                {matchingReview && publishedId === matchingReview.id && (
                  <p className="text-xs text-emerald-600 font-medium text-right flex items-center gap-1">
                    <Check className="w-3 h-3" /> Comment posted to GitHub PR!
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ReviewPRModal
        pr={reviewingPR}
        onClose={() => setReviewingPR(null)}
      />
    </>
  );
}

