"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { usePRDrafts, useDeletePRDraft } from "../api/queries";
import { parseUTCDate } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
        <DraftCard key={draft.id} draft={draft} />
      ))}
    </div>
  );
}

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { type PRDraft } from "@/lib/types/api";

function DraftCard({ draft }: { draft: PRDraft }) {
  const { mutate: deleteDraft, isPending: isDeleting } = useDeletePRDraft();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  return (
    <>
      <div
        onClick={() => router.push(`/pr-drafts/${draft.id}`)}
        className="flex items-start justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition-shadow group cursor-pointer"
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {draft.title || "Untitled Draft"}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              {formatDistanceToNow(parseUTCDate(draft.created_at), {
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
        <button 
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">Are you sure you want to delete this PR draft? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={isDeleting}
              onClick={() => {
                deleteDraft(draft.id, {
                  onSuccess: () => setShowConfirm(false)
                });
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
