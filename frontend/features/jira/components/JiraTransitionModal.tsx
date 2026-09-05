"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useJiraIssueTransitions, useTransitionJiraIssue } from "../api/queries";
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, GitBranch } from "lucide-react";
import type { JiraTransitionItem } from "@/lib/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string;
  jiraIssueKey: string;
  currentStatus?: string | null;
  workspaceId?: string | null;
  onSuccess?: (newStatus: string | null) => void;
}

const STATUS_CATEGORY_COLORS: Record<string, string> = {
  "new": "bg-slate-100 text-slate-700 border-slate-200",
  "indeterminate": "bg-blue-50 text-blue-700 border-blue-200",
  "done": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "undefined": "bg-slate-100 text-slate-500 border-slate-200",
};

export function JiraTransitionModal({
  open,
  onOpenChange,
  requirementId,
  jiraIssueKey,
  currentStatus,
  workspaceId,
  onSuccess,
}: Props) {
  const { data: transitions, isLoading } = useJiraIssueTransitions(
    open ? jiraIssueKey : null,
    workspaceId
  );
  const { mutateAsync: transitionIssue, isPending: isTransitioning } =
    useTransitionJiraIssue();

  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [postComment, setPostComment] = useState(false);
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string; newStatus?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTransition = async () => {
    if (!selectedTransitionId) return;
    setError(null);
    try {
      const res = await transitionIssue({
        requirement_id: requirementId,
        transition_id: selectedTransitionId,
        post_comment: postComment,
        comment: postComment && comment ? comment : null,
        workspace_id: workspaceId,
      });
      setResult({ success: true, message: res.message, newStatus: res.new_status });
      onSuccess?.(res.new_status ?? null);
    } catch (err: any) {
      setError(err.message || "Failed to transition issue");
    }
  };

  const handleClose = () => {
    setSelectedTransitionId(null);
    setPostComment(false);
    setComment("");
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const selectedTransition = transitions?.find((t) => t.id === selectedTransitionId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <GitBranch className="w-5 h-5 text-blue-600" />
            Transition Jira Issue
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Change the workflow status of{" "}
            <span className="font-mono font-bold text-blue-700">{jiraIssueKey}</span>
            {currentStatus && (
              <>
                {" "}from{" "}
                <span className="font-semibold text-foreground">{currentStatus}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Success state */}
        {result?.success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{result.message}</p>
              {result.newStatus && (
                <p className="text-sm text-muted-foreground mt-1">
                  New status:{" "}
                  <span className="font-semibold text-emerald-700">{result.newStatus}</span>
                </p>
              )}
            </div>
            <Button onClick={handleClose} className="mt-2 w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            {/* Transition selector */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Select New Status
              </p>
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted text-sm py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading transitions...
                </div>
              ) : !transitions?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No workflow transitions available for this issue.
                </p>
              ) : (
                <div className="grid gap-2">
                  {transitions.map((t: JiraTransitionItem) => {
                    const colorClass =
                      STATUS_CATEGORY_COLORS[t.to_status_category] ??
                      STATUS_CATEGORY_COLORS["undefined"];
                    const isSelected = selectedTransitionId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTransitionId(t.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-border/60 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? "bg-blue-500" : "bg-slate-300"
                            }`}
                          />
                          <span className="font-semibold text-sm">{t.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-3 h-3 text-muted" />
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${colorClass}`}
                          >
                            {t.to_status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional comment checkbox */}
            {selectedTransitionId && (
              <div className="space-y-2 border-t border-border/40 pt-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={postComment}
                    onChange={(e) => setPostComment(e.target.checked)}
                    className="rounded accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Post a comment to Jira confirming this transition
                  </span>
                </label>
                {postComment && (
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Leave blank to auto-generate a TraceIQ transition comment..."
                    className="w-full rounded-xl border border-border/60 bg-slate-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-muted"
                  />
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={!selectedTransitionId || isTransitioning}
                onClick={handleTransition}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isTransitioning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GitBranch className="w-4 h-4" />
                )}
                {isTransitioning
                  ? "Transitioning..."
                  : selectedTransition
                  ? `Transition to ${selectedTransition.to_status}`
                  : "Select a transition"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
