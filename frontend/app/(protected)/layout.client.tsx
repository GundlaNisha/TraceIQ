"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearchBar } from "@/features/search/components/GlobalSearchBar";
import { useEnsureBackendUser } from "@/features/auth/api/queries";
import { UserButton, useUser } from "@clerk/nextjs";
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
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Repositories", href: "/repositories", icon: FolderGit2 },
  { label: "Requirements", href: "/requirements", icon: Layers },
  { label: "Impact Analysis", href: "/analysis", icon: Activity },
  { label: "Pull Requests", href: "/pull-requests", icon: GitPullRequest },
  { label: "PR Reviews", href: "/pr-reviews", icon: CheckSquare },
  { label: "Traceability Matrix", href: "/traceability", icon: ShieldCheck },
];

export default function ProtectedLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const {
    data: backendUser,
    isLoading: backendUserLoading,
    isError: backendUserError,
  } = useEnsureBackendUser();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
      {/* Sidebar - permanently locked in place */}
      <aside className="w-64 bg-slate-50/60 backdrop-blur-md border-r border-border/50 flex flex-col py-6 px-4 gap-2 shrink-0 h-full overflow-y-auto z-30 select-none">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-2.5 px-3 mb-8">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm shadow-accent/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold font-serif text-foreground tracking-tight leading-none">
              TraceIQ
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              Code Intelligence
            </div>
          </div>
        </div>

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
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Modern Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-border/50 shrink-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 py-2.5 flex items-center justify-between gap-4">
            {/* Global Search & Active Repo Switcher */}
            <GlobalSearchBar />

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
                <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground max-w-[160px] truncate">
                  {user?.emailAddresses[0]?.emailAddress}
                </span>
                <UserButton
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
