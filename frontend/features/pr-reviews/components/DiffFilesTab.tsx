"use client";
import { useState } from "react";
import { DiffViewer } from "./DiffViewer";
import type { PRFileDiff, PRReviewFinding } from "@/lib/types/pr-review";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Plus,
  Minus,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface DiffFilesTabProps {
  diffs: PRFileDiff[];
  findings: PRReviewFinding[];
  isLoading: boolean;
}

function getFileLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "TypeScript", tsx: "TSX", js: "JavaScript", jsx: "JSX",
    py: "Python", rs: "Rust", go: "Go", java: "Java", kt: "Kotlin",
    cs: "C#", cpp: "C++", c: "C", rb: "Ruby", php: "PHP",
    css: "CSS", scss: "SCSS", html: "HTML", json: "JSON",
    yaml: "YAML", yml: "YAML", md: "Markdown", sql: "SQL",
    sh: "Shell", dockerfile: "Dockerfile",
  };
  return map[ext] ?? ext.toUpperCase();
}

function FileHeader({
  diff,
  findingCount,
  isOpen,
  onToggle,
}: {
  diff: PRFileDiff;
  findingCount: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const lang = getFileLanguage(diff.file_path);
  const parts = diff.file_path.split("/");
  const fileName = parts.pop() ?? diff.file_path;
  const dirPath = parts.join("/");

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors group"
    >
      {/* Expand icon */}
      {isOpen ? (
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      )}

      {/* File icon + path */}
      <FileCode2 className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0 flex items-baseline gap-1.5 overflow-hidden">
        {dirPath && (
          <span className="text-xs text-muted-foreground truncate shrink">{dirPath}/</span>
        )}
        <span className="text-xs font-semibold text-foreground truncate">{fileName}</span>
        {lang && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
            {lang}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {findingCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
            <AlertTriangle className="w-2.5 h-2.5" />
            {findingCount}
          </span>
        )}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {diff.additions > 0 && (
            <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
              <Plus className="w-3 h-3" />
              {diff.additions}
            </span>
          )}
          {diff.deletions > 0 && (
            <span className="flex items-center gap-0.5 text-rose-600 font-semibold">
              <Minus className="w-3 h-3" />
              {diff.deletions}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function DiffFilesTab({ diffs, findings, isLoading }: DiffFilesTabProps) {
  // Default: first file open, rest collapsed
  const [openFiles, setOpenFiles] = useState<Set<string>>(() =>
    new Set(diffs.slice(0, 1).map((d) => d.id))
  );

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <p className="text-sm">Loading diff files…</p>
      </div>
    );
  }

  if (diffs.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
        <FileCode2 className="w-10 h-10 text-border" />
        <p className="text-sm font-medium">No diff files available</p>
        <p className="text-xs text-center max-w-xs">
          Diff files are captured when a new AI review is triggered. Reviews started
          before this feature was enabled will not have diff data.
        </p>
      </div>
    );
  }

  const totalAdditions = diffs.reduce((s, d) => s + d.additions, 0);
  const totalDeletions = diffs.reduce((s, d) => s + d.deletions, 0);

  const toggleFile = (id: string) => {
    setOpenFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setOpenFiles(new Set(diffs.map((d) => d.id)));
  const collapseAll = () => setOpenFiles(new Set());

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1 py-2 mb-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{diffs.length} files changed</span>
          <span className="text-emerald-600 font-semibold">+{totalAdditions}</span>
          <span className="text-rose-600 font-semibold">−{totalDeletions}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-slate-100"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-slate-100"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="flex flex-col gap-3">
        {diffs.map((diff) => {
          const filefindings = findings.filter(
            (f) => f.file_path === diff.file_path
          );
          const isOpen = openFiles.has(diff.id);

          return (
            <div
              key={diff.id}
              className="rounded-xl border border-border/60 overflow-hidden bg-white shadow-sm"
            >
              <FileHeader
                diff={diff}
                findingCount={filefindings.length}
                isOpen={isOpen}
                onToggle={() => toggleFile(diff.id)}
              />

              {isOpen && (
                <div className="border-t border-border/50">
                  <DiffViewer patch={diff.patch} findings={filefindings} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
