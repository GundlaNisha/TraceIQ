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
    <div className="my-4 rounded-xl border border-emerald-500/30 bg-slate-900/80 p-5 backdrop-blur-md shadow-lg shadow-emerald-500/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
            <GitPullRequest className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Draft Pull Request Description</h4>
            <p className="text-xs text-slate-400">Linked to requirement {prDraft.linked_requirement || "N/A"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
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
      <div className="mt-3.5 rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Suggested PR Title</span>
        <p className="font-mono text-xs font-medium text-emerald-400 mt-0.5">{prDraft.title}</p>
      </div>

      {/* PR Body Content */}
      <div className="mt-3.5 rounded-lg border border-slate-800 bg-slate-950/80 p-4">
        {isEditing ? (
          <textarea
            value={editedMarkdown}
            onChange={(e) => setEditedMarkdown(e.target.value)}
            className="w-full min-h-[300px] font-mono text-xs text-slate-200 bg-transparent focus:outline-none resize-y"
            rows={14}
          />
        ) : (
          <div className="prose prose-invert prose-xs max-w-none text-slate-300 leading-relaxed space-y-2">
            <ReactMarkdown>{editedMarkdown}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
