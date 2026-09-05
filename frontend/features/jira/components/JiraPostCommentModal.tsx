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
import { usePostJiraComment } from "../api/queries";
import { CheckCircle2, AlertCircle, MessageSquare, Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string;
  requirementTitle: string;
  jiraIssueKey: string;
  workspaceId?: string | null;
  onSuccess?: () => void;
}

function buildDefaultComment(title: string, issueKey: string): string {
  const now = new Date().toISOString().split("T")[0];
  return [
    `## 🔍 TraceIQ Analysis Update`,
    ``,
    `**Requirement**: ${title}`,
    `**Linked Issue**: ${issueKey}`,
    `**Date**: ${now}`,
    ``,
    `---`,
    `_Auto-posted by [TraceIQ](https://github.com/GundlaNisha/TraceIQ) — Autonomous Code Impact Analysis & Traceability._`,
  ].join("\n");
}

export function JiraPostCommentModal({
  open,
  onOpenChange,
  requirementId,
  requirementTitle,
  jiraIssueKey,
  workspaceId,
  onSuccess,
}: Props) {
  const { mutateAsync: postComment, isPending } = usePostJiraComment();

  const [useCustom, setUseCustom] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string; commentId?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    setError(null);
    try {
      const res = await postComment({
        requirement_id: requirementId,
        comment_body: useCustom && commentBody.trim() ? commentBody.trim() : null,
        workspace_id: workspaceId,
      });
      setResult({ success: true, message: res.message, commentId: res.comment_id });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to post comment");
    }
  };

  const handleClose = () => {
    setUseCustom(false);
    setCommentBody("");
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const preview = useCustom && commentBody.trim()
    ? commentBody
    : buildDefaultComment(requirementTitle, jiraIssueKey);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Post to Jira
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Post a comment to{" "}
            <span className="font-mono font-bold text-blue-700">{jiraIssueKey}</span>{" "}
            with TraceIQ analysis details or custom text.
          </DialogDescription>
        </DialogHeader>

        {result?.success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{result.message}</p>
              {result.commentId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Comment ID: <span className="font-mono">{result.commentId}</span>
                </p>
              )}
            </div>
            <Button onClick={handleClose} className="mt-2 w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            {/* Mode toggle */}
            <div className="flex gap-2 rounded-xl border border-border/60 p-1 bg-slate-50">
              <button
                onClick={() => setUseCustom(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  !useCustom
                    ? "bg-white shadow-sm text-foreground border border-border/40"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-generate
              </button>
              <button
                onClick={() => setUseCustom(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  useCustom
                    ? "bg-white shadow-sm text-foreground border border-border/40"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Custom text
              </button>
            </div>

            {/* Custom input */}
            {useCustom && (
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={5}
                placeholder="Write your comment in Markdown..."
                className="w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-muted"
              />
            )}

            {/* Preview */}
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-border/40">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Preview — comment will appear in Jira
                </span>
              </div>
              <pre className="p-4 text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed bg-white">
                {preview}
              </pre>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={isPending}
                onClick={handlePost}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                {isPending ? "Posting..." : "Post to Jira"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
