"use client";
import { useState } from "react";
import {
  useWorkspace,
  useWorkspaceMembers,
  useWorkspaceRepositories,
  useWorkspaceRequirements,
  useWorkspaceInvites,
  useUnlinkRepository,
  type WorkspaceMember,
} from "@/features/workspace/api/queries";
import { useUser } from "@clerk/nextjs";
import { MemberList } from "@/features/workspace/components/MemberList";
import { InviteTeamModal } from "@/features/workspace/components/InviteTeamModal";
import { AssignRepoModal } from "@/features/workspace/components/AssignRepoModal";
import { WorkspaceSettingsModal } from "@/features/workspace/components/WorkspaceSettingsModal";
import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  UserPlus,
  Settings,
  Loader2,
  Crown,
  Shield,
  User as UserIcon,
  Eye,
  FolderGit2,
  Layers,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  Activity,
  GitPullRequest,
  CheckSquare,
  ShieldAlert,
} from "lucide-react";

const ROLE_META = {
  owner: { label: "Owner", icon: Crown, color: "text-violet-600", badge: "bg-violet-100 text-violet-700" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
  member: { label: "Member", icon: UserIcon, color: "text-slate-600", badge: "bg-slate-100 text-slate-600" },
  viewer: { label: "Viewer", icon: Eye, color: "text-slate-400", badge: "bg-slate-100 text-slate-400" },
} as const;

type ActiveTab = "repositories" | "members" | "requirements" | "guide";

export default function WorkspaceDetailClient({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { user } = useUser();
  const { data: workspace, isLoading: wsLoading } = useWorkspace(workspaceId);
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId);
  const { data: repos, isLoading: reposLoading } = useWorkspaceRepositories(workspaceId);
  const { data: requirements } = useWorkspaceRequirements(workspaceId);
  const { data: invites } = useWorkspaceInvites(workspaceId);

  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { mutate: unlinkRepo, isPending: isUnlinking } = useUnlinkRepository();

  const [activeTab, setActiveTab] = useState<ActiveTab>("repositories");
  const [showInvite, setShowInvite] = useState(false);
  const [showAssignRepo, setShowAssignRepo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const currentMember = members?.find((m) => m.user_id === user?.id);
  const currentRole = (currentMember?.role as WorkspaceMember["role"]) || null;
  const isOwner = currentRole === "owner";
  const canAdmin = isOwner || currentRole === "admin";

  if (wsLoading || !workspace) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <p className="text-sm font-medium">Loading workspace…</p>
      </div>
    );
  }

  const isActive = activeWorkspaceId === workspace.id;

  const handleCopyInvite = (token: string) => {
    const link = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Back link */}
      <Link
        href="/workspaces"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Workspaces
      </Link>

      {/* Main Header Banner */}
      <div className="bg-white/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center text-accent font-bold text-xl uppercase shrink-0 shadow-sm">
              {workspace.name.slice(0, 2)}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground tracking-tight">
                  {workspace.name}
                </h1>
                {isActive ? (
                  <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Workspace
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveWorkspace(workspace.id, workspace.name)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full transition-colors"
                  >
                    Switch to this Workspace
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {workspace.description ||
                  "Collaborative team workspace for shared code intelligence, PR reviews, and impact analysis."}
              </p>
              {currentRole && (
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      ROLE_META[currentRole]?.badge || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {(() => {
                      const Icon = ROLE_META[currentRole]?.icon || UserIcon;
                      return <Icon className="w-3 h-3" />;
                    })()}
                    Role: {ROLE_META[currentRole]?.label || currentRole}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(workspace.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {canAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInvite(true)}
                className="gap-2 text-xs border-border/60 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 text-accent" />
                Invite Member
              </Button>
            )}
            {canAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-2 text-xs border-border/60 shadow-sm"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Shared Repositories",
            value: repos?.length ?? 0,
            icon: FolderGit2,
            color: "text-blue-600",
            bg: "bg-blue-50/60 border-blue-100",
          },
          {
            label: "Team Requirements",
            value: requirements?.length ?? 0,
            icon: Layers,
            color: "text-purple-600",
            bg: "bg-purple-50/60 border-purple-100",
          },
          {
            label: "Team Members",
            value: members?.length ?? 0,
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-50/60 border-emerald-100",
          },
          {
            label: "Pending Invites",
            value: invites?.length ?? 0,
            icon: Sparkles,
            color: "text-amber-600",
            bg: "bg-amber-50/60 border-amber-100",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`rounded-2xl border p-4 shadow-sm bg-white flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {label}
              </span>
              <div className={`p-1.5 rounded-lg ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border/50 flex items-center gap-2 overflow-x-auto">
        {[
          {
            id: "repositories" as ActiveTab,
            label: "Shared Repositories",
            icon: FolderGit2,
            count: repos?.length,
          },
          {
            id: "members" as ActiveTab,
            label: "Team & Permissions",
            icon: Users,
            count: members?.length,
          },
          {
            id: "requirements" as ActiveTab,
            label: "Requirements",
            icon: Layers,
            count: requirements?.length,
          },
          {
            id: "guide" as ActiveTab,
            label: "How Workspaces Work",
            icon: Sparkles,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap -mb-px ${
                isCurrent
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isCurrent
                      ? "bg-accent/10 text-accent"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Repositories */}
      {activeTab === "repositories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold font-serif text-foreground">
                Shared Repositories
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Repositories in this workspace are accessible by all team members for AST symbol indexing, PR reviews, and blast radius analysis.
              </p>
            </div>
            {canAdmin && (
              <Button
                onClick={() => setShowAssignRepo(true)}
                size="sm"
                className="gap-2 text-xs shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Link Repository
              </Button>
            )}
          </div>

          {reposLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span className="text-sm">Loading repositories…</span>
            </div>
          ) : repos && repos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="bg-white border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-accent/30 transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 className="w-4 h-4 text-accent shrink-0" />
                        <h3 className="font-bold text-foreground text-sm truncate">
                          {repo.name}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          repo.sync_status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : repo.sync_status === "syncing"
                            ? "bg-blue-100 text-blue-800 animate-pulse"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {repo.sync_status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {repo.repo_url}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <span>Branch: <strong>{repo.default_branch}</strong></span>
                      {repo.auto_review_prs && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Auto PR Review
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Link href={`/analysis?repo_id=${repo.id}`}>
                        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                          <Activity className="w-3 h-3 text-purple-500" />
                          Impact Analysis
                        </Button>
                      </Link>
                      <Link href={`/pull-requests?repo_id=${repo.id}`}>
                        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                          <GitPullRequest className="w-3 h-3 text-blue-500" />
                          Pull Requests
                        </Button>
                      </Link>
                    </div>

                    {canAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUnlinking}
                        onClick={() =>
                          unlinkRepo({
                            workspaceId: workspace.id,
                            repositoryId: repo.id,
                          })
                        }
                        className="text-xs text-muted-foreground hover:text-rose-600 h-8 gap-1"
                        title="Remove repository from this workspace"
                      >
                        <Trash2 className="w-3 h-3" />
                        Unlink
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-slate-50/60 rounded-2xl border border-dashed border-border/70 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-border/50 flex items-center justify-center shadow-sm">
                <FolderGit2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">
                  No repositories shared in this workspace yet
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Link an existing repository so everyone in <strong>{workspace.name}</strong> can run AI PR reviews and impact analysis.
                </p>
              </div>
              {canAdmin && (
                <Button onClick={() => setShowAssignRepo(true)} className="gap-2 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Link a Repository
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Members & Permissions */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  Workspace Members ({members?.length || 0})
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage team membership and role permissions.
                </p>
              </div>
              {canAdmin && (
                <Button
                  size="sm"
                  onClick={() => setShowInvite(true)}
                  className="gap-2 text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite Teammate
                </Button>
              )}
            </div>

            <MemberList workspaceId={workspace.id} currentUserRole={currentRole} />
          </div>

          {/* Pending Invitations Section */}
          {invites && invites.length > 0 && (
            <div className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Pending Invitations ({invites.length})
              </h3>

              <div className="divide-y divide-border/40 text-xs">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-3 gap-3 flex-wrap"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {inv.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Invited as <strong className="capitalize">{inv.role}</strong> · Expires{" "}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyInvite(inv.token)}
                        className="text-xs h-7 gap-1.5"
                      >
                        {copiedToken === inv.token ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            Link Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-muted-foreground" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Requirements */}
      {activeTab === "requirements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-foreground">
                Workspace Requirements
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Functional and technical specifications tracked across this workspace.
              </p>
            </div>
            <Link href="/requirements">
              <Button size="sm" className="gap-2 text-xs">
                <Plus className="w-3.5 h-3.5" />
                New Requirement
              </Button>
            </Link>
          </div>

          {requirements && requirements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requirements.map((req: any) => (
                <div
                  key={req.id}
                  className="bg-white border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-3 hover:border-accent/30 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-foreground text-sm truncate">
                        {req.title}
                      </h3>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
                        v{req.version_number}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {req.text}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Updated {new Date(req.updated_at).toLocaleDateString()}
                    </span>
                    <Link href={`/analysis?requirement_id=${req.id}`}>
                      <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7">
                        <Activity className="w-3 h-3 text-purple-600" />
                        Run Impact Analysis
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-slate-50/60 rounded-2xl border border-dashed border-border/70 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-border/50 flex items-center justify-center shadow-sm">
                <Layers className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">
                  No requirements created for this workspace yet
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Requirements define product acceptance criteria and verify PR changes against expected architectural impacts.
                </p>
              </div>
              <Link href="/requirements">
                <Button className="gap-2 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Create First Requirement
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: How Workspaces Work (Guide) */}
      {activeTab === "guide" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-base">Shared Repositories</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Link your team's Git repositories to this workspace. Once linked, any team member with access can run AST symbol searches, inspect dependencies, and view codebase blast radii without needing separate per-user connections.
            </p>
          </div>

          <div className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-base">Team Requirements & Matrix</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Collaboratively author and version requirements. TraceIQ links requirements to codebase symbols, predicts affected test files, and builds a live Requirement-to-Code Traceability Matrix for the entire team.
            </p>
          </div>

          <div className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-base">Collaborative AI PR Reviews</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When a team member opens a Pull Request, TraceIQ cross-references the diff against the linked requirement and codebase graph. The inline diff viewer and finding annotations are visible to all workspace collaborators.
            </p>
          </div>

          <div className="bg-white border border-border/50 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-base">Role-Based Access Control (RBAC)</h3>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p>👑 <strong>Owner:</strong> Full workspace control & billing.</p>
              <p>🛡️ <strong>Admin:</strong> Link/unlink repositories, invite members, change roles.</p>
              <p>👤 <strong>Member:</strong> Trigger AI PR reviews, run impact analysis, write requirements.</p>
              <p>👁️ <strong>Viewer:</strong> Read-only access to reviews and traceability reports.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteTeamModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />

      <AssignRepoModal
        open={showAssignRepo}
        onClose={() => setShowAssignRepo(false)}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        alreadyLinkedIds={(repos || []).map((r) => r.id)}
      />

      <WorkspaceSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        workspace={workspace}
        isOwner={isOwner}
      />
    </div>
  );
}
