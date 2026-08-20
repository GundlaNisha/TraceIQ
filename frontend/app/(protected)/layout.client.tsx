"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearchBar } from "@/features/search/components/GlobalSearchBar";
import { useEnsureBackendUser } from "@/features/auth/api/queries";

import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Repositories", href: "/repositories" },
  { label: "Requirements", href: "/requirements" },
  { label: "Impact Analysis", href: "/analysis" },
  { label: "Pull Requests", href: "/pull-requests" },
  { label: "PR Reviews", href: "/pr-reviews" },
];

export default function ProtectedLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { data: backendUser, isLoading: backendUserLoading, isError: backendUserError } =
    useEnsureBackendUser();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar - permanently locked in place */}
      <aside className="w-64 bg-slate-50/30 border-r border-border/50 flex flex-col py-6 px-4 gap-2 shrink-0 h-full overflow-y-auto z-30 select-none">
        <div className="text-2xl font-bold font-serif text-foreground mb-8 px-3 tracking-tight">TraceIQ</div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white shadow-sm text-accent border border-border/50"
                  : "text-muted hover:text-foreground hover:bg-black/5 border border-transparent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="bg-background/80 backdrop-blur-xl border-b border-border/40 shrink-0 z-20">
          <div className="w-full max-w-7xl mx-auto px-8 md:px-12 py-3 flex items-center justify-between">
            <GlobalSearchBar />
            <div className="flex items-center gap-5">
              <span className="text-sm font-medium text-muted">
                {user?.emailAddresses[0]?.emailAddress}
              </span>
              <BackendSyncPill
                loading={backendUserLoading}
                error={backendUserError}
                userId={backendUser?.id}
              />
              <div className="h-4 w-px bg-border/60"></div>
              <UserButton />
            </div>
          </div>
        </header>

        {/* Scrollable Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto px-8 md:px-12 py-10 md:py-12">
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
        className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full"
      >
        syncing…
      </span>
    );
  }
  if (error || !userId) {
    return (
      <span
        title="Backend user sync failed — check the API is reachable"
        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full"
      >
        sync failed
      </span>
    );
  }
  return (
    <span
      title={`Backend user id: ${userId}`}
      className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full"
    >
      synced
    </span>
  );
}
