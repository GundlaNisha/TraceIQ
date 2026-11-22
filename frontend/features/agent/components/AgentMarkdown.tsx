"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeMarkdown } from "../lib/markdown";
import { AgentCodeBlock } from "./AgentCodeBlock";

interface AgentMarkdownProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * Shared Markdown renderer for all agent surfaces.
 * Compact spacing, reduced font size, and contrast-safe inherited text color.
 */
export const AgentMarkdown = memo(function AgentMarkdown({ content, className, isUser = false }: AgentMarkdownProps) {
  const textColor = isUser ? "text-white" : "text-foreground";

  return (
    <div className={`agent-markdown text-[12px] leading-relaxed ${textColor} ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Tightly spaced Headings with inherited text color
          h1: ({ children }) => (
            <h1 className="mt-2.5 mb-1 text-[13.5px] font-bold font-serif text-inherit tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-2 mb-0.5 text-[12.5px] font-bold font-serif text-inherit tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-1.5 mb-0.5 text-[12px] font-bold text-inherit tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-1 mb-0.5 text-[11.5px] font-semibold text-inherit tracking-tight">
              {children}
            </h4>
          ),
          // Compact Paragraphs with inherited color
          p: ({ children }) => (
            <p className="my-1 text-[12px] leading-relaxed text-inherit">
              {children}
            </p>
          ),
          // Compact Lists with inherited color
          ul: ({ children }) => (
            <ul className="my-1 space-y-0.5 list-disc list-outside pl-4 text-[12px] leading-relaxed text-inherit">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1 space-y-0.5 list-decimal list-outside pl-4 text-[12px] leading-relaxed text-inherit">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[12px] leading-relaxed text-inherit">
              {children}
            </li>
          ),
          hr: () => (
            <hr className={`my-2 ${isUser ? "border-white/20" : "border-border/60"}`} />
          ),
          // Code blocks & Inline code
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const codeString = String(children || "").replace(/\n$/, "");
            const isMultiLine = codeString.includes("\n");

            if (match || isMultiLine) {
              return (
                <AgentCodeBlock
                  code={codeString}
                  language={match ? match[1] : "plaintext"}
                />
              );
            }

            // Inline code snippet
            return (
              <code
                className={`not-prose inline-block rounded font-mono text-[10px] font-semibold px-1.5 py-0.2 border ${
                  isUser
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-slate-100 text-accent border border-border/70"
                }`}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Compact Tables
          table: ({ children }) => (
            <div className={`my-2 overflow-x-auto rounded-lg border shadow-2xs ${isUser ? "border-white/20" : "border-border/70"}`}>
              <table className="w-full border-collapse text-[11px] text-inherit">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={`border-b ${isUser ? "bg-white/10 border-white/20" : "bg-slate-100/75 border-border/70"}`}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-2.5 py-1 text-left font-semibold text-inherit">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`border-b px-2.5 py-1 align-top text-inherit last:border-b-0 ${isUser ? "border-white/15" : "border-border/40"}`}>
              {children}
            </td>
          ),
          // Compact Blockquotes
          blockquote: ({ children }) => (
            <blockquote
              className={`my-1.5 border-l-2 rounded-r-lg px-2.5 py-1 text-[11.5px] [&>p]:m-0 italic ${
                isUser
                  ? "border-white/50 bg-white/10 text-white"
                  : "border-accent bg-accent/[0.04] text-foreground/90"
              }`}
            >
              {children}
            </blockquote>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline underline-offset-2 font-medium ${
                isUser ? "text-white hover:text-white/80" : "text-accent hover:text-accent/80"
              }`}
            >
              {children}
            </a>
          ),
        }}
      >
        {normalizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
});
