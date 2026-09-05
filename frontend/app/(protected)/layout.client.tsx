"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { GlobalSearchBar } from "@/features/search/components/GlobalSearchBar";
import { useEnsureBackendUser } from "@/features/auth/api/queries";
import { UserButton, useUser } from "@clerk/nextjs";
import { WorkspaceSwitcher } from "@/features/workspace/components/WorkspaceSwitcher";
import { useState } from "react";
import { EditProfileModal } from "@/features/auth/components/EditProfileModal";
import {
  LayoutDashboard,
  FolderGit2,
  Layers,
  Activity,
  GitPullRequest,
  CheckSquare,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  UserCog,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Repositories", href: "/repositories", icon: FolderGit2 },
  { label: "Requirements", href: "/requirements", icon: Layers },
  { label: "Impact Analysis", href: "/analysis", icon: Activity },
  { label: "Pull Requests", href: "/pull-requests", icon: GitPullRequest },
  { label: "PR Reviews", href: "/pr-reviews", icon: CheckSquare },
  { label: "Traceability Matrix", href: "/traceability", icon: ShieldCheck },
  { label: "Workspaces", href: "/workspaces", icon: Users },
];

export default function ProtectedLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const {
    data: backendUser,
    isLoading: backendUserLoading,
    isError: backendUserError,
  } = useEnsureBackendUser();

  const displayName = user?.username || backendUser?.name || user?.firstName || "User";
  const displayEmail = user?.emailAddresses[0]?.emailAddress || backendUser?.email || "";

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
      {/* Sidebar - permanently locked in place */}
      <aside className="w-64 bg-slate-50/60 backdrop-blur-md border-r border-border/50 flex flex-col py-6 px-4 gap-2 shrink-0 h-full overflow-y-auto z-30 select-none justify-between">
        <div className="flex flex-col">
          {/* Brand Logo Header */}
          <Link href="/dashboard" className="flex items-center gap-2.5 px-3 mb-8 group transition-opacity hover:opacity-90">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="TraceIQ"
                width={32}
                height={32}
                className="w-8 h-8 object-contain drop-shadow-xs transition-transform group-hover:scale-105"
                priority
              />
            </div>
            <div>
              <div className="text-xl font-bold font-serif text-foreground tracking-tight leading-none">
                TraceIQ
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                Code Intelligence
              </div>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white shadow-sm text-accent border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                      : "text-muted hover:text-foreground hover:bg-black/[0.03] border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-border/50 shadow-xs hover:border-accent/40 transition-all">
            <div
              onClick={() => setEditProfileOpen(true)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 mr-2"
              title="Click to edit username & profile"
            >
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                  <span>{displayName}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {displayEmail}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditProfileOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors shrink-0"
              title="Edit username & profile"
            >
              <UserCog className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Modern Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-border/50 shrink-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 py-2.5 flex items-center justify-between gap-4">
            {/* Left: Breadcrumb & Page Name */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-muted-foreground hidden lg:inline">Workspace</span>
              <span className="text-xs text-muted-foreground/50 hidden lg:inline">/</span>
              <span className="text-xs font-bold text-foreground">
                {NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label || "Dashboard"}
              </span>
            </div>

            {/* Center: Global Search & Workspace Switcher */}
            <div className="flex-1 flex items-center gap-2 max-w-2xl mx-2">
              <div className="flex-1">
                <GlobalSearchBar />
              </div>
              <WorkspaceSwitcher />
            </div>

            {/* Right-Hand Profile & System Status */}
            <div className="flex items-center gap-3.5 shrink-0">
              {/* Sync Status Badge */}
              <BackendSyncPill
                loading={backendUserLoading}
                error={backendUserError}
                userId={backendUser?.id}
              />

              {/* User Email & Clerk Avatar */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-border/60">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-slate-100/80 px-2 py-1 rounded-lg transition-colors max-w-[180px] truncate"
                  title="Click to edit username & profile"
                >
                  <span className="font-semibold text-foreground truncate">{displayName}</span>
                  <UserCog className="w-3 h-3 text-muted-foreground shrink-0" />
                </button>
                <UserButton
                  userProfileMode="modal"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-7 h-7 rounded-xl ring-2 ring-border/50",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Edit Profile Modal */}
        <EditProfileModal
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          backendUser={backendUser}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 py-8 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function BackendSyncPill({
  loading,
  error,
  userId,
}: {
  loading: boolean;
  error: boolean;
  userId?: string;
}) {
  if (loading) {
    return (
      <span
        title="Syncing user with backend…"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60"
      >
        <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
        Syncing
      </span>
    );
  }
  if (error || !userId) {
    return (
      <span
        title="Backend user sync failed — check the API is reachable"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60"
      >
        <AlertCircle className="w-3 h-3 text-rose-600" />
        Offline
      </span>
    );
  }
  return (
    <span
      title={`Backend User ID: ${userId}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Synced
    </span>
  );
}
