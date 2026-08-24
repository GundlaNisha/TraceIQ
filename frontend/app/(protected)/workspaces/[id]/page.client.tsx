"use client";
import { useState } from "react";
import { useWorkspace, useWorkspaceMembers } from "@/features/workspace/api/queries";
import { useUser } from "@clerk/nextjs";
import { MemberList } from "@/features/workspace/components/MemberList";
import { InviteTeamModal } from "@/features/workspace/components/InviteTeamModal";
import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users, ArrowLeft, UserPlus, Settings, Loader2, Crown, Shield, User, Eye
} from "lucide-react";
import type { WorkspaceMember } from "@/features/workspace/api/queries";

const ROLE_META = {
  owner: { label: "Owner", icon: Crown, color: "text-violet-600" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-600" },
  member: { label: "Member", icon: User, color: "text-slate-600" },
  viewer: { label: "Viewer", icon: Eye, color: "text-slate-400" },
} as const;

interface Props {
  params: Promise<{ id: string }>;
}

export default function WorkspaceDetailClient({ workspaceId }: { workspaceId: string }) {
  const { user } = useUser();
  const { data: workspace, isLoading } = useWorkspace(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const [showInvite, setShowInvite] = useState(false);

  const currentMember = members?.find((m) => m.user_id === user?.id);
  const currentRole = currentMember?.role as WorkspaceMember["role"] | null ?? null;
  const canInvite = currentRole === "owner" || currentRole === "admin";

  if (isLoading || !workspace) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading workspace…</span>
      </div>
    );
  }

  const isActive = activeWorkspaceId === workspace.id;

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Back */}
      <Link
        href="/workspaces"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Workspaces
      </Link>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent font-bold text-xl uppercase shrink-0">
              {workspace.name.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">{workspace.name}</h1>
                {isActive && (
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">Active</span>
                )}
              </div>
              {workspace.description && (
                <p className="text-sm text-muted-foreground mt-1">{workspace.description}</p>
              )}
              {currentRole && (
                <div className="flex items-center gap-1.5 mt-2">
                  {(() => {
                    const meta = ROLE_META[currentRole as keyof typeof ROLE_META];
                    const Icon = meta?.icon ?? User;
                    return (
                      <>
                        <Icon className={`w-3.5 h-3.5 ${meta?.color ?? "text-slate-400"}`} />
                        <span className="text-xs text-muted-foreground">Your role: <strong>{meta?.label}</strong></span>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {!isActive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveWorkspace(workspace.id, workspace.name)}
                className="text-xs"
              >
                Set as Active
              </Button>
            )}
            {canInvite && (
              <Button size="sm" onClick={() => setShowInvite(true)} className="gap-2 text-xs">
                <UserPlus className="w-3.5 h-3.5" />
                Invite Member
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Members", value: members?.length ?? "—", icon: Users },
          { label: "Your Role", value: currentRole ? ROLE_META[currentRole as keyof typeof ROLE_META]?.label ?? currentRole : "—", icon: Shield },
          { label: "Created", value: new Date(workspace.created_at).toLocaleDateString(), icon: Settings },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white/80 border border-border/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Members section */}
      <div className="bg-white/80 border border-border/50 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Members
            <span className="text-sm font-normal text-muted-foreground">({members?.length ?? 0})</span>
          </h2>
          {canInvite && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="text-xs text-accent hover:underline font-semibold"
            >
              + Invite
            </button>
          )}
        </div>
        <MemberList workspaceId={workspaceId} currentUserRole={currentRole} />
      </div>

      <InviteTeamModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        workspaceId={workspaceId}
        workspaceName={workspace.name}
      />
    </div>
  );
}
