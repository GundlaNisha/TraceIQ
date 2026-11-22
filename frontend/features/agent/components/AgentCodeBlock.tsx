"use client";

import React, { useState, useMemo } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import Prism from "prismjs";

// Common language grammars
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";

interface AgentCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function AgentCodeBlock({ code, language = "plaintext", className }: AgentCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const normalizedLang = useMemo(() => {
    const raw = (language || "plaintext").toLowerCase().trim();
    const map: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      py: "python",
      sh: "bash",
      shell: "bash",
      zsh: "bash",
      yml: "yaml",
      rs: "rust",
      golang: "go",
    };
    return map[raw] || raw;
  }, [language]);

  const { displayFileName, cleanCode } = useMemo(() => {
    const trimmed = code.trim();
    const lines = trimmed.split("\n");
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const match = firstLine.match(/^(?:\/\/|#|\/\*)\s*([\w\-./\\]+\.[a-zA-Z0-9]+)\s*(?:\*\/)?$/);
      if (match) {
        return {
          displayFileName: match[1],
          cleanCode: lines.slice(1).join("\n").trim(),
        };
      }
    }
    return {
      displayFileName: null,
      cleanCode: trimmed,
    };
  }, [code]);

  const highlightedHtml = useMemo(() => {
    try {
      const grammar = Prism.languages[normalizedLang];
      if (grammar) {
        return Prism.highlight(cleanCode, grammar, normalizedLang);
      }
    } catch {}
    return null;
  }, [cleanCode, normalizedLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className={`not-prose my-2.5 overflow-hidden rounded-lg border border-white/10 bg-[#0B1220] shadow-xs text-xs ${className || ""}`}
      style={{ backgroundColor: "#0B1220", color: "#E2E8F0" }}
    >
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#111C33]/80 px-3 py-1.5 text-[10px] text-slate-300">
        <div className="flex items-center gap-1.5 min-w-0">
          <Terminal className="h-3 w-3 text-emerald-400 shrink-0" />
          {displayFileName ? (
            <span className="font-mono text-[11px] font-medium text-slate-200 truncate">
              {displayFileName}
            </span>
          ) : (
            <span className="font-mono uppercase font-semibold text-slate-400">
              {normalizedLang !== "plaintext" ? normalizedLang : "code"}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 opacity-70" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Compact Code Body */}
      <div className="overflow-x-auto p-3 text-[11px] font-mono leading-relaxed">
        {highlightedHtml ? (
          <pre
            className="!m-0 !p-0 !bg-transparent !border-0 text-slate-200 font-mono text-[11px] leading-relaxed selection:bg-emerald-500/30"
            style={{ background: "transparent", padding: 0, margin: 0 }}
          >
            <code
              className="!m-0 !p-0 !bg-transparent !border-0 !rounded-none font-mono text-[11px] text-inherit"
              style={{ background: "transparent", padding: 0, margin: 0, display: "block" }}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        ) : (
          <pre
            className="!m-0 !p-0 !bg-transparent !border-0 text-slate-200 font-mono text-[11px] leading-relaxed"
            style={{ background: "transparent", padding: 0, margin: 0 }}
          >
            <code
              className="!m-0 !p-0 !bg-transparent !border-0 !rounded-none font-mono text-[11px] text-inherit"
              style={{ background: "transparent", padding: 0, margin: 0, display: "block" }}
            >
              {cleanCode}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
