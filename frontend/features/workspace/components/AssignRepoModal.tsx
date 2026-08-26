"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRepositories } from "@/features/repositories/api/queries";
import { useAssignRepository } from "@/features/workspace/api/queries";
import {
  FolderGit2,
  Plus,
  Loader2,
  Check,
  Building2,
  User,
  ExternalLink,
} from "lucide-react";

interface AssignRepoModalProps {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onClose: () => void;
  alreadyLinkedIds?: string[];
}

export function AssignRepoModal({
  workspaceId,
  workspaceName,
  open,
  onClose,
}: AssignRepoModalProps) {
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: allRepos, isLoading } = useRepositories({ all: true });
  const { mutate: assignRepo, isPending } = useAssignRepository();

  const availableRepos = (allRepos || []).filter(
    (repo: any) => repo.workspace_id !== workspaceId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoId) return;
    setError(null);

    assignRepo(
      { workspaceId, repositoryId: selectedRepoId },
      {
        onSuccess: () => {
          setSelectedRepoId("");
          onClose();
        },
        onError: (err: any) => {
          setError(err.message || "Failed to link repository");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl border border-border/60 shadow-2xl">
        <DialogHeader className="mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold text-foreground truncate">
                Link Repository to Workspace
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transfer access to <strong className="text-foreground">{workspaceName}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs font-medium">Loading accessible repositories…</span>
          </div>
        ) : availableRepos.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-muted-foreground">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No unassigned repositories available</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                All your existing repositories already belong to <strong>{workspaceName}</strong>, or you haven't connected any repositories yet.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Select a Repository to Transfer
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {availableRepos.length} available
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                All team members in <strong>{workspaceName}</strong> will gain access to this repository for code indexing, PR reviews, and impact analysis.
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2 border border-border/60 rounded-xl p-2 bg-slate-50/60">
                {availableRepos.map((repo: any) => {
                  const isSelected = selectedRepoId === repo.id;
                  const currentLoc = repo.workspace_name ? repo.workspace_name : "Personal Workspace";

                  return (
                    <div
                      key={repo.id}
                      onClick={() => setSelectedRepoId(repo.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left cursor-pointer transition-all ${
                        isSelected
                          ? "bg-accent/5 border-2 border-accent shadow-xs"
                          : "bg-white hover:bg-slate-100/80 border border-border/70 hover:border-border"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-foreground truncate">
                            {repo.name}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              repo.workspace_name
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {repo.workspace_name ? (
                              <Building2 className="w-2.5 h-2.5" />
                            ) : (
                              <User className="w-2.5 h-2.5" />
                            )}
                            {currentLoc}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                          {repo.repo_url}
                        </p>
                      </div>

                      {/* Selection Radio / Check Pill */}
                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-border/80 bg-white" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 font-medium">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isPending}
                className="text-xs h-9 px-4 rounded-xl border-border/70 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !selectedRepoId}
                className="bg-accent hover:bg-accent/90 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-sm gap-1.5 min-w-[140px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Linking…
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Link to Workspace
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
