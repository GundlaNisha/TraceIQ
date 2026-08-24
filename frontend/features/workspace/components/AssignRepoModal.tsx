"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRepositories } from "@/features/repositories/api/queries";
import { useAssignRepository } from "@/features/workspace/api/queries";
import { FolderGit2, Plus, Loader2, Check } from "lucide-react";

interface AssignRepoModalProps {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onClose: () => void;
  alreadyLinkedIds: string[];
}

export function AssignRepoModal({
  workspaceId,
  workspaceName,
  open,
  onClose,
  alreadyLinkedIds,
}: AssignRepoModalProps) {
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: allRepos, isLoading } = useRepositories();
  const { mutate: assignRepo, isPending } = useAssignRepository();

  const availableRepos = (allRepos || []).filter(
    (repo: any) => !alreadyLinkedIds.includes(repo.id)
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
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-border/40 shadow-2xl sm:rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold font-serif tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-accent" />
            Link Repository to {workspaceName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading repositories…</span>
          </div>
        ) : availableRepos.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground space-y-3">
            <p className="text-sm">No unlinked repositories available.</p>
            <p className="text-xs">
              All your existing repositories are already linked to this workspace, or you have not connected any repositories yet.
            </p>
            <Button variant="outline" onClick={onClose} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Select a Repository to Share
              </Label>
              <p className="text-xs text-muted-foreground">
                All team members in <strong>{workspaceName}</strong> will gain access to this repository for AST indexing, PR reviews, and impact analysis.
              </p>

              <div className="max-h-56 overflow-y-auto space-y-1.5 border border-border/50 rounded-xl p-2 bg-slate-50/50">
                {availableRepos.map((repo: any) => {
                  const isSelected = selectedRepoId === repo.id;
                  return (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => setSelectedRepoId(repo.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-accent text-white shadow-sm"
                          : "bg-white text-foreground hover:bg-slate-100 border border-border/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{repo.name}</p>
                        <p
                          className={`text-[10px] truncate ${
                            isSelected ? "text-white/80" : "text-muted-foreground"
                          }`}
                        >
                          {repo.repo_url}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" onClick={onClose} className="border-border/60">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedRepoId} className="gap-2">
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isPending ? "Linking…" : "Link to Workspace"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
