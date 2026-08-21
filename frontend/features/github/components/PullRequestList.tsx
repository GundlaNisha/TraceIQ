"use client";

import { useState, useMemo } from "react";
import { usePullRequests } from "../api/queries";
import { usePRReviews, usePublishPRComment } from "@/features/pr-reviews/api/queries";
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  RotateCw,
  MessageSquarePlus,
  Check,
  Search,
  Filter,
  FolderGit2,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReviewPRModal } from "@/features/pr-reviews/components/ReviewPRModal";
import Link from "next/link";
import type { GitHubPullRequest } from "@/lib/types/github";

type FilterTab = "open" | "all" | "merged" | "closed" | "reviewed";
type SortOption = "updated_desc" | "created_desc" | "number_desc";

export function PullRequestList() {
  const { data: prs, isLoading, isError } = usePullRequests();
  const { data: prReviews } = usePRReviews();
  const [reviewingPR, setReviewingPR] = useState<GitHubPullRequest | null>(null);
  const { mutate: publishComment } = usePublishPRComment();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<{ id: string; message: string } | null>(null);

  // Filters State
  const [activeTab, setActiveTab] = useState<FilterTab>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated_desc");

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

  // Distinct repositories
  const repositoriesList = useMemo(() => {
    if (!prs) return [];
    const set = new Set<string>();
    prs.forEach((pr) => {
      if (pr.repository_name) set.add(pr.repository_name);
    });
    return Array.from(set).sort();
  }, [prs]);

  // Counts by tab
  const counts = useMemo(() => {
    if (!prs) return { open: 0, all: 0, merged: 0, closed: 0, reviewed: 0 };
    let open = 0;
    let merged = 0;
    let closed = 0;
    let reviewed = 0;

    prs.forEach((pr) => {
      if (pr.state === "open") open++;
      else if (pr.state === "merged") merged++;
      else if (pr.state === "closed") closed++;

      const hasReview = prReviews?.some(
        (r) =>
          r.pr_number === pr.number &&
          ((r.pr_html_url && pr.html_url && r.pr_html_url.replace(/\/$/, "") === pr.html_url.replace(/\/$/, "")) ||
            r.pr_title === pr.title)
      );
      if (hasReview) reviewed++;
    });

    return {
      open,
      all: prs.length,
      merged,
      closed,
      reviewed,
    };
  }, [prs, prReviews]);

  // Filtered & Sorted PRs
  const filteredPRs = useMemo(() => {
    if (!prs) return [];

    return prs
      .filter((pr) => {
        // 1. Tab filter
        if (activeTab === "open" && pr.state !== "open") return false;
        if (activeTab === "merged" && pr.state !== "merged") return false;
        if (activeTab === "closed" && pr.state !== "closed") return false;
        if (activeTab === "reviewed") {
          const hasReview = prReviews?.some(
            (r) =>
              r.pr_number === pr.number &&
              ((r.pr_html_url && pr.html_url && r.pr_html_url.replace(/\/$/, "") === pr.html_url.replace(/\/$/, "")) ||
                r.pr_title === pr.title)
          );
          if (!hasReview) return false;
        }

        // 2. Repository filter
        if (selectedRepo !== "all" && pr.repository_name !== selectedRepo) return false;

        // 3. Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = pr.title.toLowerCase().includes(q);
          const matchNum = `#${pr.number}`.includes(q) || String(pr.number) === q;
          const matchAuthor = pr.user?.login?.toLowerCase().includes(q);
          const matchRepo = pr.repository_name?.toLowerCase().includes(q);
          if (!matchTitle && !matchNum && !matchAuthor && !matchRepo) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "created_desc") {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (sortBy === "number_desc") {
          return b.number - a.number;
        }
        // Default: updated_desc
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      });
  }, [prs, prReviews, activeTab, selectedRepo, searchQuery, sortBy]);

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
        <p className="text-muted text-lg font-medium">No pull requests found.</p>
        <p className="text-sm text-muted-foreground">When you open a PR on your tracked repositories, it will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Controls Toolbar: Tabs & Search Filter */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-2 bg-white/80 backdrop-blur-md rounded-2xl border border-border/60 shadow-sm">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("open")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "open"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Open</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "open"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {counts.open}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "all"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All PRs</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "all"
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("merged")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "merged"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Merged</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "merged"
                    ? "bg-white/20 text-white"
                    : "bg-purple-50 text-purple-700 border border-purple-200"
                }`}
              >
                {counts.merged}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("closed")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "closed"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Closed</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "closed"
                    ? "bg-white/20 text-white"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {counts.closed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reviewed")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "reviewed"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Reviewed</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "reviewed"
                    ? "bg-white/20 text-white"
                    : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                }`}
              >
                {counts.reviewed}
              </span>
            </button>
          </div>

          {/* Search, Repo Filter & Sorting Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Filter by title, author, #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs bg-slate-50/70 border-border/70 h-8 rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Repository Filter Dropdown */}
            {repositoriesList.length > 1 && (
              <div className="relative">
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="h-8 pl-2.5 pr-7 text-xs font-medium rounded-xl border border-border/70 bg-slate-50/70 text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="all">All Repositories</option>
                  {repositoriesList.map((repo) => (
                    <option key={repo} value={repo}>
                      {repo}
                    </option>
                  ))}
                </select>
                <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-8 pl-2.5 pr-7 text-xs font-medium rounded-xl border border-border/70 bg-slate-50/70 text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="updated_desc">Recently Updated</option>
                <option value="created_desc">Newest Created</option>
                <option value="number_desc">PR # (Highest)</option>
              </select>
              <ArrowUpDown className="w-3 h-3 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* PR List */}
        {filteredPRs.length === 0 ? (
          <div className="py-16 text-center bg-white/50 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center gap-2">
            <Filter className="w-8 h-8 text-muted/40 mb-1" />
            <p className="text-foreground font-semibold text-sm">
              No matching pull requests found
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              No pull requests matched the "{activeTab}" filter or search query.
            </p>
            {(searchQuery || selectedRepo !== "all" || activeTab !== "open") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => {
                  setActiveTab("all");
                  setSearchQuery("");
                  setSelectedRepo("all");
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredPRs.map((pr) => {
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
                    {pr.state === "open" && !pr.draft && (
                      <span title="Open Pull Request">
                        <GitPullRequest className="w-6 h-6 text-emerald-500" />
                      </span>
                    )}
                    {pr.state === "open" && pr.draft && (
                      <span title="Draft Pull Request">
                        <GitPullRequest className="w-6 h-6 text-slate-400" />
                      </span>
                    )}
                    {pr.state === "merged" && (
                      <span title="Merged Pull Request">
                        <GitMerge className="w-6 h-6 text-purple-500" />
                      </span>
                    )}
                    {pr.state === "closed" && (
                      <span title="Closed Pull Request">
                        <XCircle className="w-6 h-6 text-rose-500" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                        {pr.repository_name}
                      </span>
                      <span className="text-sm font-medium text-muted">#{pr.number}</span>

                      {/* State Badge */}
                      {pr.state === "open" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          Open
                        </span>
                      )}
                      {pr.state === "merged" && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                          Merged
                        </span>
                      )}
                      {pr.state === "closed" && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                          Closed
                        </span>
                      )}

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
                          {matchingReview.status === "completed" && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {matchingReview.status === "running" && (
                            <RotateCw className="w-3 h-3 animate-spin" />
                          )}
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

                    <h3 className="text-xl font-semibold text-foreground leading-tight">
                      {pr.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {pr.user.avatar_url ? (
                          <img
                            src={pr.user.avatar_url}
                            alt={pr.user.login}
                            className="w-5 h-5 rounded-full ring-2 ring-white"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200" />
                        )}
                        <span className="font-medium text-foreground">{pr.user.login}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        Updated {formatTimeAgo(pr.updated_at)}
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
        )}
      </div>

      <ReviewPRModal pr={reviewingPR} onClose={() => setReviewingPR(null)} />
    </>
  );
}
