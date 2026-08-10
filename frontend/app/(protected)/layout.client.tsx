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
  { label: "Analysis", href: "/analysis" },
  { label: "PR Drafts", href: "/pr-drafts" },
  { label: "Reviews", href: "/reviews" },
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
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r flex flex-col p-4 gap-1">
        <div className="text-lg font-bold text-gray-900 mb-6 px-2">TraceIQ</div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <GlobalSearchBar />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {user?.emailAddresses[0]?.emailAddress}
            </span>
            {/* Backend sync status pill — confirms the JWT → DB round-trip. */}
            <BackendSyncPill
              loading={backendUserLoading}
              error={backendUserError}
              userId={backendUser?.id}
            />
            <UserButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
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
