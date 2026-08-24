"use client";
import { useState, useMemo } from "react";
import { usePRReviews, useRerunPRReview, useDeletePRReview } from "../api/queries";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";
import {
  GitPullRequest,
  Sparkles,
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  RefreshCw,
  Trash2,
  Building2,
  FolderGit2,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PRReview } from "@/lib/types/pr-review";

const STATUS_CONFIG = {
  queued: { label: "Queued", icon: Clock, className: "bg-slate-100 text-slate-600 border-slate-200" },
  running: { label: "Analyzing…", icon: Loader2, className: "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", icon: XCircle, className: "bg-rose-50 text-rose-700 border-rose-200" },
} as const;

export function PRReviewList() {
  const { data: reviews, isLoading, isError } = usePRReviews();
  const { mutate: rerunReview, isPending: isRerunning } = useRerunPRReview();
  const { mutate: deleteReview, isPending: isDeleting } = useDeletePRReview();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Distinct workspace options
  const workspaceOptions = useMemo(() => {
    if (!reviews) return [];
    const map = new Map<string, string>();
    reviews.forEach((r) => {
      if (r.workspace_id && r.workspace_name) {
        map.set(r.workspace_id, r.workspace_name);
      } else {
        map.set("personal", "Personal Workspace");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    return reviews.filter((r) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.pr_title.toLowerCase().includes(q);
        const matchesRepo = (r.repository_name || "").toLowerCase().includes(q);
        const matchesWS = (r.workspace_name || "").toLowerCase().includes(q);
        const matchesNum = `#${r.pr_number}`.includes(q);
        if (!matchesTitle && !matchesRepo && !matchesWS && !matchesNum) return false;
      }

      // Workspace filter
      if (selectedWorkspace !== "all") {
        if (selectedWorkspace === "personal") {
          if (r.workspace_id) return false;
        } else {
          if (r.workspace_id !== selectedWorkspace) return false;
        }
      }

      // Status filter
      if (selectedStatus !== "all" && r.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [reviews, searchQuery, selectedWorkspace, selectedStatus]);

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
    <div className="flex flex-col gap-6">
      {/* Workspace & Search Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-border/50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, repo, PR #..."
            className="pl-9 bg-white/70 h-9 rounded-xl border-border/60 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-end">
          {/* Workspace Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-border/60 rounded-xl px-2.5 py-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Workspaces</option>
              {workspaceOptions.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-border/60 rounded-xl px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-muted" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="queued">Queued</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="py-16 text-center bg-white/50 rounded-2xl border border-border/50 text-muted">
          No PR reviews match the selected filters.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredReviews.map((review: PRReview) => {
            const statusKey = review.status as keyof typeof STATUS_CONFIG;
            const { label, icon: Icon, className } = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.queued;
            const wsName = review.workspace_name || "Personal Workspace";
            const isPersonal = !review.workspace_id;

            return (
              <div
                key={review.id}
                className="flex items-start justify-between gap-5 p-5 bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-accent/30 transition-all group"
              >
                <Link
                  href={`/pr-reviews/${review.id}`}
                  className="flex items-start gap-4 min-w-0 flex-1"
                >
                  <div className="hidden md:flex shrink-0 pt-1">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <GitPullRequest className="w-5 h-5 text-accent" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Metadata badges: Workspace, Repo, Status */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}>
                        <Icon className={`w-3.5 h-3.5 ${review.status === "running" ? "animate-spin" : ""}`} />
                        {label}
                      </span>

                      {/* Workspace Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isPersonal
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                        title={isPersonal ? "Personal Workspace" : `Shared in ${wsName}`}
                      >
                        <Building2 className="w-3 h-3" />
                        {wsName}
                      </span>

                      {/* Repository Badge */}
                      {review.repository_name && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-600 bg-slate-100/90 border border-slate-200">
                          <FolderGit2 className="w-3 h-3 text-slate-400" />
                          {review.repository_name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                      {review.pr_title}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">PR #{review.pr_number}</p>

                    {review.summary && (
                      <p className="text-sm text-muted mt-2 line-clamp-2 leading-relaxed">{review.summary}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeAgo(review.created_at)}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {review.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRerunning}
                      onClick={(e) => {
                        e.stopPropagation();
                        rerunReview(review.id);
                      }}
                      className="gap-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200 font-semibold shadow-none h-8 px-2.5"
                      title="Retry failed PR review in-place"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isDeleting}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this PR review?")) {
                        deleteReview(review.id);
                      }
                    }}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs h-8 px-2"
                    title="Delete PR review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
