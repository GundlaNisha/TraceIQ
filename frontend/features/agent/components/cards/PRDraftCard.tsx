"use client";

import { useState } from "react";
import { GitPullRequest, Copy, Check, Edit3, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { PRDraft } from "../../types";

interface PRDraftCardProps {
  prDraft: PRDraft;
}

export function PRDraftCard({ prDraft }: PRDraftCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState(prDraft.raw_markdown);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-4 rounded-2xl border border-border/80 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 border border-emerald-200">
            <GitPullRequest className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-serif text-foreground tracking-tight">
              Draft Pull Request Description
            </h4>
            <p className="text-xs text-muted-foreground">
              Linked to requirement {prDraft.linked_requirement || "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-slate-50 transition shadow-2xs"
          >
            {isEditing ? (
              <>
                <Eye className="h-3.5 w-3.5" /> Preview
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" /> Edit Inline
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 transition shadow-xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Markdown
              </>
            )}
          </button>
        </div>
      </div>

      {/* PR Title Display */}
      <div className="mt-3.5 rounded-xl border border-border/60 bg-[#FAF8F5]/80 px-3.5 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Suggested PR Title
        </span>
        <p className="font-mono text-xs font-medium text-emerald-700 mt-0.5">{prDraft.title}</p>
      </div>

      {/* PR Body Content */}
      <div className="mt-3.5 rounded-xl border border-border/60 bg-[#FAF8F5]/50 p-4">
        {isEditing ? (
          <textarea
            value={editedMarkdown}
            onChange={(e) => setEditedMarkdown(e.target.value)}
            className="w-full min-h-[300px] font-mono text-xs text-foreground bg-white border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
            rows={14}
          />
        ) : (
          <div className="prose prose-slate prose-xs max-w-none text-foreground leading-relaxed space-y-2 prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground prose-code:text-[#1B2A4A] prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
            <ReactMarkdown>{editedMarkdown}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
