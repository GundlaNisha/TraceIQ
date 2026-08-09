"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearchBar } from "@/features/search/components/GlobalSearchBar";
import { USE_MOCK } from "@/lib/api/config";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Repositories", href: "/repositories" },
  { label: "Requirements", href: "/requirements" },
  { label: "Reviews", href: "/reviews" },
  { label: "Analysis", href: "/analysis/job_1" }, // Point to mock job to prevent 404
  { label: "PR Drafts", href: "/pr-drafts/draft_1" }, // Point to mock draft to prevent 404
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
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
              {USE_MOCK ? "Mock mode" : user?.emailAddresses[0]?.emailAddress}
            </span>
            <UserButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
