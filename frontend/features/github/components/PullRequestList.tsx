"use client";
import { useState } from "react";
import { usePullRequests } from "../api/queries";
import { GitPullRequest, GitMerge, XCircle, Clock, ExternalLink, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ReviewPRModal } from "@/features/pr-reviews/components/ReviewPRModal";
import type { GitHubPullRequest } from "@/lib/types/github";

export function PullRequestList() {
  const { data: prs, isLoading, isError } = usePullRequests();
  const [reviewingPR, setReviewingPR] = useState<GitHubPullRequest | null>(null);

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
        {prs.map((pr) => (
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
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                  {pr.repository_name}
                </span>
                <span className="text-sm font-medium text-muted">#{pr.number}</span>
                {pr.draft && (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    Draft
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
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-accent/20 text-accent hover:bg-accent/5 hover:border-accent/40 font-semibold text-xs"
                onClick={() => setReviewingPR(pr)}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Review PR
              </Button>
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
          </div>
        ))}
      </div>

      <ReviewPRModal
        pr={reviewingPR}
        onClose={() => setReviewingPR(null)}
      />
    </>
  );
}

