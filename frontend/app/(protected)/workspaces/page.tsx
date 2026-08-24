"use client";
import { useState } from "react";
import Link from "next/link";
import { useWorkspaces, useCreateWorkspace } from "@/features/workspace/api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  Users, Plus, ArrowRight, Loader2, Sparkles, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function CreateWorkspaceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { mutate: createWorkspace, isPending } = useCreateWorkspace();
  const { setActiveWorkspace } = useWorkspaceStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createWorkspace(
      { name, description: description || undefined },
      {
        onSuccess: (ws) => {
          setActiveWorkspace(ws.id, ws.name);
          onClose();
          setName("");
          setDescription("");
        },
        onError: (err: any) => setError(err.message || "Failed to create workspace"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-border/40 shadow-2xl sm:rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold font-serif tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Create Team Workspace
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Workspace name <span className="text-rose-500">*</span>
            </Label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering Team"
              className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shared workspace for the core engineering team"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white resize-none"
            />
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
            <Button type="submit" disabled={isPending || !name.trim()} className="gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isPending ? "Creating…" : "Create Workspace"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkspacesPage() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Collaborate with your team by sharing repositories, requirements, and reviews.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          New Workspace
        </Button>
      </div>

      {/* Personal workspace card */}
      <div className="bg-white/80 border border-border/50 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Personal Workspace</p>
            <p className="text-xs text-muted-foreground">Your private space — repositories and reviews visible only to you</p>
          </div>
        </div>
        <Button
          variant={!activeWorkspaceId ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveWorkspace(null, null)}
          className="shrink-0 text-xs"
        >
          {!activeWorkspaceId ? "Active" : "Switch to Personal"}
        </Button>
      </div>

      {/* Team workspaces */}
      <div>
        <h2 className="text-lg font-semibold font-serif text-foreground mb-4">Team Workspaces</h2>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading workspaces…</span>
          </div>
        ) : workspaces && workspaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`bg-white/80 border rounded-2xl p-5 shadow-sm flex flex-col gap-3 transition-all ${
                  activeWorkspaceId === ws.id
                    ? "border-accent/40 ring-1 ring-accent/20"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm uppercase shrink-0">
                    {ws.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">{ws.name}</p>
                      {activeWorkspaceId === ws.id && (
                        <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-bold shrink-0">Active</span>
                      )}
                    </div>
                    {ws.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ws.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  <Button
                    size="sm"
                    variant={activeWorkspaceId === ws.id ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setActiveWorkspace(ws.id, ws.name)}
                  >
                    {activeWorkspaceId === ws.id ? "Active" : "Switch"}
                  </Button>
                  <Link href={`/workspaces/${ws.id}`}>
                    <Button size="sm" variant="ghost" className="text-xs gap-1">
                      Manage
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-border/40 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-border/50 flex items-center justify-center shadow-sm">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No team workspaces yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Create a workspace to collaborate with your team on shared repositories and analyses.
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create your first workspace
            </Button>
          </div>
        )}
      </div>

      <CreateWorkspaceModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
