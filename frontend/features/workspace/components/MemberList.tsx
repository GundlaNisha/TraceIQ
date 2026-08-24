"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useWorkspaceMembers,
  useUpdateMemberRole,
  useRemoveMember,
  type WorkspaceMember,
} from "@/features/workspace/api/queries";
import {
  Crown, Shield, User, Eye, MoreHorizontal, Trash2, RefreshCw, Loader2,
} from "lucide-react";

const ROLE_META = {
  owner: { label: "Owner", icon: Crown, badge: "bg-violet-100 text-violet-700 border-violet-200" },
  admin: { label: "Admin", icon: Shield, badge: "bg-blue-100 text-blue-700 border-blue-200" },
  member: { label: "Member", icon: User, badge: "bg-slate-100 text-slate-600 border-slate-200" },
  viewer: { label: "Viewer", icon: Eye, badge: "bg-slate-100 text-slate-400 border-slate-200" },
} as const;

const PROMOTABLE_ROLES = ["viewer", "member", "admin"] as const;

interface MemberListProps {
  workspaceId: string;
  currentUserRole: WorkspaceMember["role"] | null;
}

export function MemberList({ workspaceId, currentUserRole }: MemberListProps) {
  const { user } = useUser();
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const { mutate: updateRole, isPending: isUpdating } = useUpdateMemberRole();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner = currentUserRole === "owner";

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading members…</span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {(members ?? []).map((member) => {
        const roleKey = member.role as keyof typeof ROLE_META;
        const { label, icon: RoleIcon, badge } = ROLE_META[roleKey] ?? ROLE_META.viewer;
        const isSelf = member.user_id === user?.id;
        const isOwnerMember = member.role === "owner";
        const showActions = canManage && !isOwnerMember;

        return (
          <div key={member.id} className="flex items-center gap-3 py-3 px-1 group">
            {/* Avatar placeholder */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-accent/60" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {member.user_id}
                {isSelf && <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(you)</span>}
              </p>
            </div>

            {/* Role badge */}
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge} shrink-0`}>
              <RoleIcon className="w-2.5 h-2.5" />
              {label}
            </span>

            {/* Actions menu */}
            {showActions && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {openMenu === member.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-border/60 rounded-xl shadow-xl z-10 py-1 text-xs">
                    {/* Change role options */}
                    {isOwner && PROMOTABLE_ROLES.filter((r) => r !== member.role).map((role) => (
                      <button
                        key={role}
                        type="button"
                        disabled={isUpdating}
                        onClick={() => {
                          updateRole({ workspaceId, userId: member.user_id, role });
                          setOpenMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left capitalize transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 text-muted-foreground" />
                        Make {role}
                      </button>
                    ))}

                    {/* Remove */}
                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() => {
                        removeMember({ workspaceId, userId: member.user_id });
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 text-rose-600 text-left transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove member
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Self-leave */}
            {isSelf && !isOwnerMember && (
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => removeMember({ workspaceId, userId: member.user_id })}
                className="text-[10px] text-muted-foreground hover:text-rose-600 transition-colors px-2 py-1 rounded opacity-0 group-hover:opacity-100"
              >
                Leave
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
