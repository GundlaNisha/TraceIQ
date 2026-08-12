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
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium">Loading PR drafts...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-rose-500 py-12 text-center">Failed to load drafts.</div>
    );
  }

  if (!drafts?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-white/50 border border-border/40 shadow-sm backdrop-blur-sm">
        <div className="w-12 h-12 bg-accent/5 rounded-full flex items-center justify-center text-accent mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold font-serif text-foreground mb-1">No PR drafts</h3>
        <p className="text-muted text-sm max-w-sm">
          You haven&rsquo;t generated any PR drafts yet. Go to an Analysis job and click &rdquo;Generate PR Draft&rdquo; to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        className="group flex flex-col bg-white/80 backdrop-blur-sm border border-border/40 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 hover:border-accent/30 transition-all duration-200 cursor-pointer relative"
      >
        <button 
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-3 mb-6 pr-8">
          <span
            className={`inline-flex w-max items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
              draft.status === "edited" ? "bg-accent/10 text-accent" : "bg-slate-100 text-muted"
            }`}
          >
            {draft.status === "edited" ? "Edited" : "Generated"}
          </span>
          <h3 className="text-lg font-semibold font-serif text-foreground group-hover:text-accent transition-colors line-clamp-2">
            {draft.title || "Untitled Draft"}
          </h3>
        </div>
        
        <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center text-xs font-medium text-muted">
          <span>{formatDistanceToNow(parseUTCDate(draft.created_at), { addSuffix: true })}</span>
          <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            View Draft <span>&rarr;</span>
          </span>
        </div>
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
