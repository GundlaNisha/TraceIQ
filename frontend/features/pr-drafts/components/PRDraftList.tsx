"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { usePRDrafts } from "../api/queries";

export function PRDraftList() {
  const { data: drafts, isLoading, isError } = usePRDrafts();

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-8">Loading drafts...</div>;
  }

  if (isError) {
    return (
      <div className="text-sm text-red-500 py-8">Failed to load drafts.</div>
    );
  }

  if (!drafts?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-gray-50/50">
        <h3 className="text-sm font-medium text-gray-900 mb-1">No PR drafts</h3>
        <p className="text-xs text-gray-500 text-center max-w-sm mb-4">
          You haven&rsquo;t generated any PR drafts yet. Go to an Analysis job
          and click &rdquo;Generate PR Draft&rdquo; to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft) => (
        <Link
          key={draft.id}
          href={`/pr-drafts/${draft.id}`}
          className="flex items-start justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition-shadow group"
        >
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {draft.title || "Untitled Draft"}
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                {formatDistanceToNow(new Date(draft.created_at), {
                  addSuffix: true,
                })}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${draft.status === "edited" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}
              >
                {draft.status === "edited" ? "Edited" : "Generated"}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
