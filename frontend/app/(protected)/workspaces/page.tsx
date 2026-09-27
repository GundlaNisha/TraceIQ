"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useWorkspaces,
  useCreateWorkspace,
  useMyWorkspaceInvitations,
  useAcceptInvite,
  useDeclineInvite,
} from "@/features/workspace/api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  Users,
  Plus,
  ArrowRight,
  Loader2,
  Sparkles,
  Crown,
  Shield,
  User as UserIcon,
  Building2,
  FolderGit2,
  Check,
  CheckCircle2,
  Mail,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        onError: (err: any) =>
          setError(err.message || "Failed to create workspace"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-border/40 shadow-2xl sm:rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold font-serif tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent" />
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
              placeholder="e.g. Core Engineering"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white shadow-2xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shared workspace for team code intelligence and PR reviews"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white resize-none shadow-2xs"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 font-medium">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border/60 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="gap-2 text-xs rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isPending ? "Creating…" : "Create Workspace"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkspacesPage() {
  const router = useRouter();
  const { data: workspaces, isLoading } = useWorkspaces();
  const { data: myInvitations } = useMyWorkspaceInvitations();
  const { mutate: acceptInvite } = useAcceptInvite();
  const { mutate: declineInvite } = useDeclineInvite();
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const [showCreate, setShowCreate] = useState(false);
  const [actingToken, setActingToken] = useState<string | null>(null);

  const isPersonalActive = !activeWorkspaceId;

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground tracking-tight">
            Workspaces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Collaborate with your team by sharing repositories, requirements, and reviews.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="gap-2 shrink-0 bg-accent hover:bg-accent/90 text-white text-xs font-semibold rounded-xl h-10 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Workspace
        </Button>
      </div>

      {/* Pending Workspace Invitations for You */}
      {myInvitations && myInvitations.length > 0 && (
        <div className="bg-gradient-to-r from-accent/10 via-purple-500/10 to-indigo-500/10 border border-accent/30 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-xs">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  Invitations for You ({myInvitations.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  You have been invited to collaborate in these workspaces. Accept to gain access.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myInvitations.map((inv) => {
              const isActing = actingToken === inv.token;
              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl border border-border/60 p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-accent/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                          {inv.workspace_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {inv.workspace_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {inv.invited_by_name || inv.invited_by_email ? (
                              <>
                                Invited by <strong>{inv.invited_by_name || inv.invited_by_email}</strong>
                              </>
                            ) : (
                              "Team invitation"
                            )}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-semibold capitalize bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20 shrink-0">
                        {inv.role}
                      </span>
                    </div>

                    {inv.workspace_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {inv.workspace_description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground/70" />
                      <span>Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                    <Link
                      href={`/join/${inv.token}`}
                      className="text-xs text-accent hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Preview
                    </Link>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isActing}
                        onClick={() => {
                          if (confirm(`Decline invitation to join ${inv.workspace_name}?`)) {
                            setActingToken(inv.token);
                            declineInvite(inv.token, {
                              onSettled: () => setActingToken(null),
                            });
                          }
                        }}
                        className="text-xs h-8 hover:text-rose-600 hover:bg-rose-50 border-border/60"
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        disabled={isActing}
                        onClick={() => {
                          setActingToken(inv.token);
                          acceptInvite(inv.token, {
                            onSuccess: (ws) => {
                              setActiveWorkspace(ws.id, ws.name);
                              setActingToken(null);
                              router.push("/dashboard");
                            },
                            onError: () => setActingToken(null),
                          });
                        }}
                        className="text-xs h-8 gap-1.5 shadow-2xs"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Personal Workspace Hero Card */}
      <div
        className={`rounded-2xl p-6 transition-all duration-200 border ${
          isPersonalActive
            ? "bg-white border-accent/40 shadow-sm ring-1 ring-accent/20"
            : "bg-white/80 border-border/60 hover:bg-white hover:border-border/80"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isPersonalActive
                  ? "bg-accent text-white border-accent/30 shadow-xs"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="font-bold text-foreground text-base">
                  Personal Workspace
                </p>
                {isPersonalActive && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Workspace
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
                Your private individual space — repositories, requirements, and PR reviews are strictly private to you.
              </p>
            </div>
          </div>

          <Button
            variant={isPersonalActive ? "outline" : "default"}
            size="sm"
            onClick={() => setActiveWorkspace(null, null)}
            className={`shrink-0 text-xs font-semibold rounded-xl h-9 px-4 ${
              isPersonalActive
                ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 pointer-events-none"
                : "bg-accent hover:bg-accent/90 text-white"
            }`}
          >
            {isPersonalActive ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Active
              </span>
            ) : (
              "Switch to Personal"
            )}
          </Button>
        </div>
      </div>

      {/* Team Workspaces Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif text-foreground">
            Team Workspaces
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            {workspaces?.length || 0} team workspace{workspaces?.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs font-medium">Loading team workspaces…</span>
          </div>
        ) : workspaces && workspaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((ws) => {
              const isActive = activeWorkspaceId === ws.id;

              return (
                <div
                  key={ws.id}
                  className={`bg-white rounded-2xl p-6 border transition-all duration-200 flex flex-col justify-between gap-5 ${
                    isActive
                      ? "border-indigo-400 shadow-md ring-2 ring-indigo-400/20"
                      : "border-border/60 hover:border-border hover:shadow-xs"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base uppercase shrink-0">
                          {ws.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground text-base truncate">
                            {ws.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {ws.user_role && (
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {ws.user_role}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
                      {ws.description ||
                        "Collaborative space for shared code intelligence, requirements, and PR reviews."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <Button
                      size="sm"
                      variant={isActive ? "outline" : "default"}
                      className={`text-xs font-semibold rounded-xl h-8.5 px-3.5 ${
                        isActive
                          ? "border-indigo-200 text-indigo-700 bg-indigo-50/50 pointer-events-none"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                      onClick={() => setActiveWorkspace(ws.id, ws.name)}
                    >
                      {isActive ? "Active Workspace" : "Make Active"}
                    </Button>

                    <Link href={`/workspaces/${ws.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground rounded-xl h-8.5"
                      >
                        Manage & Members
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-border flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">
                No team workspaces yet
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Create a workspace to collaborate with team members on shared repositories, requirements, and blast radius analyses.
              </p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="gap-2 text-xs rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold h-9 px-4"
            >
              <Plus className="w-4 h-4" />
              Create Team Workspace
            </Button>
          </div>
        )}
      </div>

      <CreateWorkspaceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
