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
import {
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Loader2,
  Sparkles,
  ExternalLink,
  Bot,
  Eye,
  Code2,
  Send,
  PenLine,
} from "lucide-react";

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

function SimpleMarkdownPreview({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-xs leading-relaxed text-foreground">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal rule
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={idx} className="border-t border-border/60 my-2" />;
        }

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-xs text-foreground mt-2">
              {trimmed.replace("### ", "")}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-sm text-foreground flex items-center gap-1.5 mt-2">
              {trimmed.replace("## ", "")}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={idx} className="font-bold text-base text-foreground mt-2">
              {trimmed.replace("# ", "")}
            </h2>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const itemText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>{renderInlineFormatting(itemText)}</span>
            </div>
          );
        }

        // Italic footer
        if (trimmed.startsWith("_") && trimmed.endsWith("_")) {
          return (
            <p key={idx} className="text-[11px] text-muted-foreground italic pt-1">
              {renderInlineFormatting(trimmed.slice(1, -1))}
            </p>
          );
        }

        // Regular paragraph
        return <p key={idx}>{renderInlineFormatting(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Simple bold parser **text**
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
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
  const [viewMode, setViewMode] = useState<"rich" | "raw">("rich");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    commentId?: string | null;
  } | null>(null);
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
    setViewMode("rich");
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const preview = useCustom && commentBody.trim()
    ? commentBody
    : buildDefaultComment(requirementTitle, jiraIssueKey);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-serif tracking-tight text-foreground">
                Post Comment to Jira
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Post analysis findings or custom notes directly to issue{" "}
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80">
                  {jiraIssueKey}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {result?.success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{result.message}</p>
              {result.commentId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Comment ID:{" "}
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                    {result.commentId}
                  </span>
                </p>
              )}
            </div>
            <Button
              onClick={handleClose}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Mode Switcher */}
            <div className="flex p-1 rounded-xl bg-slate-100/80 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setUseCustom(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  !useCustom
                    ? "bg-white shadow-xs text-blue-700 border border-border/50"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-generate</span>
              </button>
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  useCustom
                    ? "bg-white shadow-xs text-blue-700 border border-border/50"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Custom text</span>
              </button>
            </div>

            {/* Custom Input */}
            {useCustom && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className="font-medium uppercase tracking-wider">Comment Content (Markdown)</span>
                  <span>Supports headings, bold, bullet points</span>
                </div>
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={4}
                  placeholder={`## 🔍 TraceIQ Impact Summary\n- Risk Level: Medium\n- Impacted Files: 3\n...`}
                  className="w-full rounded-xl border border-border/60 bg-white p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-muted"
                />
              </div>
            )}

            {/* Preview Box with Rich & Raw Toggle */}
            <div className="rounded-xl border border-border/50 bg-white shadow-2xs overflow-hidden">
              {/* Preview Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-border/40 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    Jira Comment Preview
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setViewMode("rich")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all ${
                      viewMode === "rich"
                        ? "bg-white text-blue-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Formatted
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("raw")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-all ${
                      viewMode === "raw"
                        ? "bg-white text-blue-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    Raw Markdown
                  </button>
                </div>
              </div>

              {/* Mock Jira Comment Card */}
              <div className="p-4 bg-slate-50/40">
                <div className="bg-white rounded-xl border border-border/60 p-4 shadow-2xs space-y-3">
                  {/* Jira Comment Author Mock */}
                  <div className="flex items-center gap-2 border-b border-border/30 pb-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">TraceIQ Bot</span>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1 py-0.2 rounded uppercase">
                        APP
                      </span>
                      <span className="text-[11px] text-muted-foreground">Just now</span>
                    </div>
                  </div>

                  {/* Comment Body */}
                  {viewMode === "rich" ? (
                    <SimpleMarkdownPreview content={preview} />
                  ) : (
                    <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-border/40 max-h-[180px] overflow-y-auto">
                      {preview}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={handlePost}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 shadow-xs"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {isPending ? "Posting to Jira..." : "Post to Jira"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
