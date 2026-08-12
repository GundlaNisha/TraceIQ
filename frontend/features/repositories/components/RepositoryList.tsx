"use client";
import { useRepositories, useDeleteRepository } from "../api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import { type Repository } from "@/lib/types/api";
import { Button } from "@/components/ui/button";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-slate-100 text-muted" },
  syncing: {
    label: "Syncing",
    className: "bg-blue-50 text-blue-700",
  },
  completed: { label: "Ready", className: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", className: "bg-rose-50 text-rose-700" },
};

export function RepositoryList() {
  const { data: repos, isLoading, isError } = useRepositories();
  const { mutate: deleteRepo } = useDeleteRepository();
  const { setActiveRepositoryId, activeRepositoryId } = useWorkspaceStore();

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
              Branch
            </th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody>
          {repos.map((repo: Repository) => {
            const badge = STATUS_BADGE[repo.sync_status] ?? STATUS_BADGE.pending;
            const isActive = repo.id === activeRepositoryId;
            return (
              <tr
                key={repo.id}
                className={`border-b border-border/40 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${isActive ? "bg-accent/5" : ""}`}
                onClick={() => setActiveRepositoryId(repo.id)}
              >
                <td className="px-6 py-4 font-semibold text-foreground">
                  {repo.name}
                  {isActive && <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-white uppercase tracking-wider">Active</span>}
                </td>
                <td className="px-6 py-4 text-muted font-mono text-xs truncate max-w-xs">
                  {repo.repo_url}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}
                  >
                    {repo.sync_status === "syncing" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    {badge.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted font-medium">
                  {repo.default_branch}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRepo(repo.id);
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
