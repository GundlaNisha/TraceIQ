"use client";

import { useAnalysisJobs, useDeleteAnalysisJob } from "../api/queries";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  FolderGit2,
  FileText,
  Sparkles,
  ArrowRight,
  Building2,
  Search,
  Filter,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { type AnalysisJob } from "@/lib/types/api";
import { useRouter, useSearchParams } from "next/navigation";

export function AnalysisList() {
  const searchParams = useSearchParams();
  const repoId = searchParams.get("repo_id");
  const reqId = searchParams.get("requirement_id");

  const { data: jobs, isLoading, isError } = useAnalysisJobs(repoId, reqId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Distinct workspaces
  const workspaceOptions = useMemo(() => {
    if (!jobs) return [];
    const map = new Map<string, string>();
    jobs.forEach((j) => {
      if (j.workspace_id && j.workspace_name) {
        map.set(j.workspace_id, j.workspace_name);
      } else {
        map.set("personal", "Personal Workspace");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((j) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (j.requirement_title || "").toLowerCase().includes(q);
        const matchesRepo = (j.repository_name || "").toLowerCase().includes(q);
        const matchesWS = (j.workspace_name || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesRepo && !matchesWS) return false;
      }

      // Workspace
      if (selectedWorkspace !== "all") {
        if (selectedWorkspace === "personal") {
          if (j.workspace_id) return false;
        } else {
          if (j.workspace_id !== selectedWorkspace) return false;
        }
      }

      // Status
      if (selectedStatus !== "all" && j.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [jobs, searchQuery, selectedWorkspace, selectedStatus]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium">Loading analysis jobs...</p>
      </div>
    );
  }

  if (isError) {
    return <div className="text-sm text-rose-500 py-12 text-center">Failed to load analysis jobs.</div>;
  }

  if (!jobs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-white/50 border border-border/40 shadow-sm backdrop-blur-sm">
        <div className="w-12 h-12 bg-accent/5 rounded-full flex items-center justify-center text-accent mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold font-serif text-foreground mb-1">No analysis jobs</h3>
        <p className="text-muted text-sm max-w-sm">
          You haven't run any impact analysis yet. Go to a Requirement and click "Analyze" to run one.
        </p>
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
            placeholder="Search by title, repo, workspace..."
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

      {/* Grid */}
      {filteredJobs.length === 0 ? (
        <div className="py-16 text-center bg-white/50 rounded-2xl border border-border/50 text-muted">
          No analysis jobs match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <AnalysisJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisJobCard({ job }: { job: AnalysisJob }) {
  const { mutate: deleteJob, isPending: isDeleting } = useDeleteAnalysisJob();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const title = job.requirement_title || "Requirement Impact Analysis";
  const isPersonal = !job.workspace_id;
  const wsName = job.workspace_name || "Personal Workspace";

  return (
    <>
      <div
        onClick={() => router.push(`/analysis/${job.id}`)}
        className="group flex flex-col bg-white/80 backdrop-blur-sm border border-border/40 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-accent/30 transition-all duration-200 cursor-pointer relative"
      >
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 z-10"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-3 mb-6 pr-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                job.status === "completed"
                  ? "bg-emerald-50 text-emerald-700"
                  : job.status === "failed"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {job.status !== "completed" && job.status !== "failed" && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
              {job.status} {job.status !== "completed" && job.status !== "failed" ? `(${job.progress}%)` : ""}
            </span>

            {/* Workspace Badge */}
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isPersonal
                  ? "bg-slate-100 text-slate-700 border border-slate-200"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
              }`}
              title={isPersonal ? "Personal Workspace" : `Workspace: ${wsName}`}
            >
              <Building2 className="w-3 h-3" />
              {wsName}
            </span>

            {/* Repository Badge */}
            {job.repository_name && (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                <FolderGit2 className="w-3 h-3 text-slate-400" />
                {job.repository_name}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold font-serif text-foreground group-hover:text-accent transition-colors line-clamp-2">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-muted" />
              Impact Blast Radius Analysis
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center text-xs font-medium text-muted">
          <span>{formatTimeAgo(job.created_at)}</span>
          <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-semibold">
            View Analysis <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this analysis job? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                deleteJob(job.id, {
                  onSuccess: () => setShowConfirm(false),
                });
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
