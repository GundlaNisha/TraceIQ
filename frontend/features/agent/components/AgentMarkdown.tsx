"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeMarkdown } from "../lib/markdown";

interface AgentMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Shared Markdown renderer for all agent surfaces (chat, cards, inspector).
 * GFM tables/task-lists + normalization of model quirks (<br>, flat tables).
 */
export const AgentMarkdown = memo(function AgentMarkdown({ content, className }: AgentMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border/60 px-3 py-2 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/40 px-3 py-2 align-top text-foreground/90 last:border-b-0">
              {children}
            </td>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl bg-slate-950 p-3.5 text-xs leading-relaxed text-slate-100">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-accent/40 bg-accent/[0.04] rounded-r-xl px-4 py-2.5 text-foreground/90 [&>p]:m-0">
              {children}
            </blockquote>
          ),
        }}
      >
        {normalizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
});
