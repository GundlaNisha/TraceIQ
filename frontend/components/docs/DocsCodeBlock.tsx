"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface Props {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function DocsCodeBlock({ code, language = "bash", filename, showLineNumbers = false }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");

  return (
    <div className="my-4 rounded-xl bg-[#1B2A4A] text-slate-200 border border-white/15 overflow-hidden shadow-md text-xs font-mono">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-white">{filename || language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors text-[10px]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 opacity-70" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto leading-relaxed text-slate-300">
        {showLineNumbers ? (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-white/5">
                  <td className="pr-4 text-right select-none text-slate-400 font-mono text-[10px] w-6">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre font-mono">{line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="whitespace-pre font-mono">{code.trim()}</pre>
        )}
      </div>
    </div>
  );
}
