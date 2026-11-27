"use client";

import Link from "next/link";
import { FileText, Zap, ExternalLink } from "lucide-react";
import type { PRReview } from "@/lib/types/pr-review";

interface Props {
  review: PRReview;
  variant?: "badge" | "panel";
}

/**
 * Displays the requirement attached to a PR review (or indicates none is attached).
 * Uses non-interactive spans in "badge" mode so it stays valid inside card <Link>s.
 */
export function AttachedRequirementBadge({ review, variant = "badge" }: Props) {
  const hasRequirement = Boolean(review.requirement_id);
  const title = review.requirement_title;
  const jiraKey = review.requirement_jira_issue_key;
  const jiraUrl = review.requirement_jira_issue_url;
  const jiraStatus = review.requirement_jira_status;
  const version = review.requirement_version_number;

  if (variant === "panel") {
    if (!hasRequirement) {
      return (
        <div className="bg-slate-50/80 border border-border/50 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong className="text-foreground font-semibold">Attached Requirement:</strong> None — general code quality &amp; security review
            </span>
          </div>
          <Link
            href={`/requirements?repo_id=${encodeURIComponent(review.repository_id)}`}
            className="text-accent font-semibold hover:underline shrink-0"
          >
            Manage Requirements →
          </Link>
        </div>
      );
    }

    return (
      <div className="bg-blue-50/50 border border-blue-200/70 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1.5 font-semibold text-blue-900 shrink-0">
            {jiraKey ? <Zap className="w-4 h-4 text-blue-600" /> : <FileText className="w-4 h-4 text-blue-600" />}
            Attached Requirement:
          </span>

          {jiraKey && (
            jiraUrl ? (
              <a
                href={jiraUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-100/60 transition-colors"
              >
                {jiraKey}
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            ) : (
              <span className="inline-flex items-center font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                {jiraKey}
              </span>
            )
          )}

          <span className="font-semibold text-foreground truncate max-w-md">
            {title || `Requirement ${review.requirement_id?.slice(0, 8)}`}
          </span>

          {version != null && (
            <span className="px-1.5 py-0.5 rounded bg-white text-slate-600 font-mono text-[10px] font-semibold border border-slate-200">
              v{version}
            </span>
          )}

          {jiraStatus && (
            <span className="px-2 py-0.5 rounded-full bg-white text-blue-700 font-semibold text-[10px] border border-blue-200">
              {jiraStatus}
            </span>
          )}
        </div>

        <Link
          href={`/requirements?repo_id=${encodeURIComponent(review.repository_id)}`}
          className="text-blue-700 font-semibold hover:underline shrink-0"
        >
          View Requirement →
        </Link>
      </div>
    );
  }

  if (!hasRequirement) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-500 bg-slate-100/80 border border-slate-200/80">
        <FileText className="w-3 h-3 text-slate-400" />
        No requirement attached
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 max-w-full"
      title={title || "Attached Requirement"}
    >
      {jiraKey ? <Zap className="w-3 h-3 text-blue-600 shrink-0" /> : <FileText className="w-3 h-3 text-blue-600 shrink-0" />}
      <span className="truncate max-w-[280px]">
        {jiraKey && !title?.startsWith(`[${jiraKey}]`) ? `[${jiraKey}] ` : ""}
        {title || jiraKey || "Requirement Attached"}
      </span>
      {version != null && (
        <span className="text-[10px] font-mono text-blue-600/80 shrink-0">v{version}</span>
      )}
    </span>
  );
}
