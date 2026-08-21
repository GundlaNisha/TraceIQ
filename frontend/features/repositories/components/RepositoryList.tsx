"use client";

import { useState } from "react";
import {
  useRepositories,
  useDeleteRepository,
  useResyncRepository,
  useCancelRepositorySync,
} from "../api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import { type Repository } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  Settings,
  Trash2,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Square,
  Zap,
} from "lucide-react";
import { RepoSettingsModal } from "./RepoSettingsModal";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-slate-100 text-muted" },
  syncing: {
    label: "Syncing",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  completed: {
    label: "Ready",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-50 text-rose-700 border border-rose-200",
  },
};

export function RepositoryList() {
  const { data: repos, isLoading, isError } = useRepositories();
  const { mutate: deleteRepo } = useDeleteRepository();
  const { mutate: resyncRepo, isPending: isResyncPending } = useResyncRepository();
  const { mutate: cancelSync, isPending: isCancelPending } = useCancelRepositorySync();
  const { setActiveRepositoryId, activeRepositoryId } = useWorkspaceStore();
  const [selectedRepoForSettings, setSelectedRepoForSettings] =
    useState<Repository | null>(null);

  if (isLoading)
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        Loading repositories...
      </div>
    );
  if (isError)
    return (
      <div className="text-sm text-red-500 py-8 text-center">
        Failed to load repositories.
      </div>
    );
  if (!repos?.length)
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        No repositories yet. Add one to get started.
      </div>
    );

  return (
    <>
      <div className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-md shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50 border-b border-border/40">
            <tr>
              <th className="text-left px-6 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                Name
              </th>
              <th className="text-left px-6 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                URL
              </th>
              <th className="text-left px-6 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                Status
              </th>
              <th className="text-left px-6 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                Automation
              </th>
              <th className="text-left px-6 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                Branch
              </th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo: Repository) => {
              const badge = STATUS_BADGE[repo.sync_status] ?? STATUS_BADGE.pending;
              const isActive = repo.id === activeRepositoryId;
              const isSyncing = repo.sync_status === "syncing";
              const isFailed = repo.sync_status === "failed";

              return (
                <tr
                  key={repo.id}
                  className={`group border-b border-border/40 last:border-0 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                    isActive ? "bg-accent/5" : ""
                  }`}
                  onClick={() => setActiveRepositoryId(repo.id)}
                >
                  <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                    {repo.github_installation_id && (
                      <span title="GitHub App Connected">
                        <GitBranch className="w-4 h-4 text-muted-foreground" />
                      </span>
                    )}
                    {repo.name}
                    {isActive && (
                      <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-white uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted font-mono text-xs truncate max-w-xs">
                    {repo.repo_url}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}
                    >
                      {isSyncing && (
                        <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                      )}
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {repo.auto_review_prs && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold"
                          title="Auto-Review PRs enabled"
                        >
                          <Sparkles className="w-3 h-3" /> Auto-Review
                        </span>
                      )}
                      {repo.auto_post_comments && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold"
                          title="Auto-Post Comments enabled"
                        >
                          <MessageSquare className="w-3 h-3" /> Auto-Comment
                        </span>
                      )}
                      {!repo.auto_review_prs && !repo.auto_post_comments && (
                        <span className="text-xs text-muted-foreground">Manual</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted font-medium">
                    {repo.default_branch}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Resync / Stop / Restart Actions */}
                      {isSyncing ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isCancelPending}
                          className="gap-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200 font-semibold shadow-none h-8 px-2.5"
                          title="Stop ongoing repository sync"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelSync(repo.id);
                          }}
                        >
                          <Square className="w-3 h-3 fill-amber-700" />
                          Stop Sync
                        </Button>
                      ) : isFailed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isResyncPending}
                          className="gap-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border-rose-200 font-semibold shadow-none h-8 px-2.5"
                          title="Restart failed repository sync"
                          onClick={(e) => {
                            e.stopPropagation();
                            resyncRepo(repo.id);
                          }}
                        >
                          <Zap className="w-3 h-3" />
                          Retry Sync
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isResyncPending}
                          className="gap-1.5 text-xs text-slate-700 hover:text-accent font-medium shadow-none h-8 px-2.5"
                          title="Reprocess repository AST graph and vector index"
                          onClick={(e) => {
                            e.stopPropagation();
                            resyncRepo(repo.id);
                          }}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Resync
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-foreground hover:text-accent font-medium shadow-none h-8 px-2.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRepoForSettings(repo);
                        }}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRepo(repo.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RepoSettingsModal
        repo={selectedRepoForSettings}
        isOpen={Boolean(selectedRepoForSettings)}
        onClose={() => setSelectedRepoForSettings(null)}
      />
    </>
  );
}
