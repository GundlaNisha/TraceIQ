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
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  GitBranch,
  Check,
  Clock,
  CircleDot,
  MessageSquare,
} from "lucide-react";
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

const STATUS_CATEGORY_CONFIG: Record<
  string,
  { badgeClass: string; dotClass: string; icon: typeof CheckCircle2 }
> = {
  done: {
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
    icon: CheckCircle2,
  },
  indeterminate: {
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
    icon: Clock,
  },
  new: {
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
    icon: CircleDot,
  },
  undefined: {
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
    icon: CircleDot,
  },
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
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    newStatus?: string | null;
  } | null>(null);
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
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-serif tracking-tight text-foreground">
                Transition Jira Issue
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Update the workflow status of{" "}
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80">
                  {jiraIssueKey}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Success state */}
        {result?.success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{result.message}</p>
              {result.newStatus && (
                <p className="text-xs text-muted-foreground mt-1">
                  New status:{" "}
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {result.newStatus}
                  </span>
                </p>
              )}
            </div>
            <Button onClick={handleClose} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Status Flow Indicator */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted font-medium">Current Status:</span>
                <span className="font-semibold px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-2xs">
                  {currentStatus || "To Do"}
                </span>
              </div>

              {selectedTransition && (
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-muted font-medium">Target:</span>
                  <span
                    className={`font-semibold px-2.5 py-0.5 rounded-md border shadow-2xs ${
                      STATUS_CATEGORY_CONFIG[selectedTransition.to_status_category]?.badgeClass ??
                      STATUS_CATEGORY_CONFIG.undefined.badgeClass
                    }`}
                  >
                    {selectedTransition.to_status}
                  </span>
                </div>
              )}
            </div>

            {/* Transition selector */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Select New Status
              </p>

              {isLoading ? (
                <div className="flex items-center gap-2 text-muted text-sm py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Loading workflow transitions...
                </div>
              ) : !transitions?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center bg-slate-50 rounded-xl border border-dashed border-border/60">
                  No workflow transitions available for this issue.
                </p>
              ) : (
                <div className="grid gap-2">
                  {transitions.map((t: JiraTransitionItem) => {
                    const isSelected = selectedTransitionId === t.id;
                    const isCurrent =
                      currentStatus &&
                      t.to_status.trim().toLowerCase() === currentStatus.trim().toLowerCase();
                    const categoryConfig =
                      STATUS_CATEGORY_CONFIG[t.to_status_category] ??
                      STATUS_CATEGORY_CONFIG.undefined;
                    const CategoryIcon = categoryConfig.icon;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTransitionId(t.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                            : "border-border/60 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Radio style circle */}
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "border border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>

                          <div className="flex items-center gap-2">
                            <CategoryIcon className={`w-4 h-4 shrink-0 ${
                              isSelected ? "text-blue-600" : "text-muted"
                            }`} />
                            <span className="font-semibold text-sm text-foreground">
                              {t.to_status}
                            </span>
                            {t.name !== t.to_status && (
                              <span className="text-[11px] text-muted-foreground font-normal">
                                ({t.name})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCurrent ? (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Current Status
                            </span>
                          ) : (
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${categoryConfig.badgeClass}`}
                            >
                              {t.to_status}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional comment section */}
            {selectedTransitionId && (
              <div className="rounded-xl border border-border/50 bg-slate-50/70 p-3.5 space-y-2 transition-all">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={postComment}
                    onChange={(e) => setPostComment(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    Post a comment to Jira issue {jiraIssueKey} confirming this transition
                  </span>
                </label>

                {postComment && (
                  <div className="pt-1.5">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      placeholder="Optional custom comment (leave blank for automatic TraceIQ transition summary)..."
                      className="w-full text-xs rounded-lg border border-border/60 bg-white p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-muted-foreground/60 resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedTransitionId || isTransitioning}
                onClick={handleTransition}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 shadow-xs"
              >
                {isTransitioning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5" />
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
