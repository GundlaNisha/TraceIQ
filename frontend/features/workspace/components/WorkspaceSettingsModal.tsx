"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUpdateWorkspace, useDeleteWorkspace, type Workspace } from "@/features/workspace/api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import { Settings, Trash2, Loader2, Save } from "lucide-react";

interface WorkspaceSettingsModalProps {
  workspace: Workspace;
  isOwner: boolean;
  open: boolean;
  onClose: () => void;
}

export function WorkspaceSettingsModal({
  workspace,
  isOwner,
  open,
  onClose,
}: WorkspaceSettingsModalProps) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { setActiveWorkspace, activeWorkspaceId } = useWorkspaceStore();
  const { mutate: updateWorkspace, isPending: isUpdating } = useUpdateWorkspace();
  const { mutate: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace();

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateWorkspace(
      { id: workspace.id, name, description: description || undefined },
      {
        onSuccess: (updated) => {
          if (activeWorkspaceId === workspace.id) {
            setActiveWorkspace(updated.id, updated.name);
          }
          onClose();
        },
        onError: (err: any) => setError(err.message || "Failed to update workspace"),
      }
    );
  };

  const handleDelete = () => {
    setError(null);
    deleteWorkspace(workspace.id, {
      onSuccess: () => {
        if (activeWorkspaceId === workspace.id) {
          setActiveWorkspace(null, null);
        }
        onClose();
        router.push("/workspaces");
      },
      onError: (err: any) => setError(err.message || "Failed to delete workspace"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-border/40 shadow-2xl sm:rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold font-serif tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            Workspace Settings
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Workspace Name <span className="text-rose-500">*</span>
            </Label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Description
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" onClick={onClose} className="border-border/60">
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating || !name.trim()} className="gap-1.5">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </form>

        {isOwner && (
          <div className="mt-6 pt-5 border-t border-rose-100 space-y-3">
            <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Danger Zone</p>
            <p className="text-xs text-muted-foreground">
              Deleting this workspace will unassign all shared repositories and remove all members.
            </p>

            {!confirmDelete ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Workspace
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-rose-800">
                  Are you absolutely sure you want to delete this workspace?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
                  >
                    {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                    Confirm Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
