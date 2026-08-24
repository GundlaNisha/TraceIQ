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
  Crown,
  Shield,
  User as UserIcon,
  Eye,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Loader2,
  Mail,
} from "lucide-react";

const ROLE_META = {
  owner: {
    label: "Owner",
    icon: Crown,
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    desc: "Full workspace control & billing",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    desc: "Can manage members & repositories",
  },
  member: {
    label: "Member",
    icon: UserIcon,
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    desc: "Can trigger reviews & create requirements",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    badge: "bg-slate-100 text-slate-400 border-slate-200",
    desc: "Read-only access",
  },
} as const;

const PROMOTABLE_ROLES = ["viewer", "member", "admin"] as const;

interface MemberListProps {
  workspaceId: string;
  currentUserRole: WorkspaceMember["role"] | null;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function MemberList({ workspaceId, currentUserRole }: MemberListProps) {
  const { user: clerkUser } = useUser();
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
        const { label, icon: RoleIcon, badge, desc } =
          ROLE_META[roleKey] ?? ROLE_META.viewer;
        const isSelf = member.user_id === clerkUser?.id;
        const isOwnerMember = member.role === "owner";
        const showActions = canManage && !isOwnerMember;

        // Resolve display name and email with Clerk fallback for current user
        const displayName =
          member.user_name ||
          (isSelf ? clerkUser?.fullName || clerkUser?.firstName : null) ||
          member.user_email ||
          member.user_id;

        const displayEmail =
          member.user_email ||
          (isSelf ? clerkUser?.primaryEmailAddress?.emailAddress : null);

        const avatarUrl =
          member.user_image || (isSelf ? clerkUser?.imageUrl : null);

        const initials = getInitials(displayName, displayEmail);

        return (
          <div
            key={member.id}
            className="flex items-center gap-3.5 py-3.5 px-2 hover:bg-slate-50/50 rounded-xl transition-colors group"
          >
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-border/60 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-xs">
                {initials}
              </div>
            )}

            {/* Name & Email Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {displayName}
                </p>
                {isSelf && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
              {displayEmail && displayEmail !== displayName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                  <Mail className="w-3 h-3 opacity-60 shrink-0" />
                  {displayEmail}
                </p>
              )}
            </div>

            {/* Role badge */}
            <div className="flex flex-col items-end shrink-0">
              <span
                title={desc}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badge}`}
              >
                <RoleIcon className="w-3 h-3" />
                {label}
              </span>
            </div>

            {/* Actions menu */}
            {showActions && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenu(openMenu === member.id ? null : member.id)
                  }
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 text-muted-foreground transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {openMenu === member.id && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border/60 rounded-xl shadow-xl z-20 py-1 text-xs animate-in fade-in slide-in-from-top-1">
                    {/* Change role options */}
                    {isOwner &&
                      PROMOTABLE_ROLES.filter((r) => r !== member.role).map(
                        (role) => (
                          <button
                            key={role}
                            type="button"
                            disabled={isUpdating}
                            onClick={() => {
                              updateRole({
                                workspaceId,
                                userId: member.user_id,
                                role,
                              });
                              setOpenMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left capitalize transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 text-muted-foreground" />
                            Make {role}
                          </button>
                        )
                      )}

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
                      Remove from workspace
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
                onClick={() =>
                  removeMember({ workspaceId, userId: member.user_id })
                }
                className="text-xs text-muted-foreground hover:text-rose-600 transition-colors px-2 py-1 rounded"
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
