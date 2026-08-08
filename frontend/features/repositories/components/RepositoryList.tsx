"use client";
import { useRepositories, useDeleteRepository } from "../api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/button";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  syncing: {
    label: "Syncing",
    className: "bg-blue-100 text-blue-700 animate-pulse",
  },
  completed: { label: "Ready", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
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
    <div className="rounded-lg border bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              Name
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              URL
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">
              Branch
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => {
            const badge = STATUS_BADGE[repo.sync_status] ?? STATUS_BADGE.pending;
            const isActive = repo.id === activeRepositoryId;
            return (
              <tr
                key={repo.id}
                className={`border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${isActive ? "bg-blue-50" : ""}`}
                onClick={() => setActiveRepositoryId(repo.id)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {repo.name}
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-xs">
                  {repo.repo_url}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {repo.default_branch}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
