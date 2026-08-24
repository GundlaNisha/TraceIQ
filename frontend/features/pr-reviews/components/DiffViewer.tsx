"use client";
import { useMemo } from "react";
import type { PRReviewFinding } from "@/lib/types/pr-review";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Unified diff parser
// ---------------------------------------------------------------------------

interface DiffLine {
  type: "added" | "removed" | "context" | "hunk-header";
  content: string;
  /** Line number in the new file (undefined for removed/hunk-header lines) */
  newLineNo?: number;
  /** Line number in the old file (undefined for added/hunk-header lines) */
  oldLineNo?: number;
}

function parsePatch(patch: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    // Hunk header: @@ -a,b +c,d @@
    const hunkMatch = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      lines.push({ type: "hunk-header", content: raw });
      continue;
    }

    // Skip diff --git header lines
    if (
      raw.startsWith("diff --git") ||
      raw.startsWith("index ") ||
      raw.startsWith("--- ") ||
      raw.startsWith("+++ ")
    ) {
      continue;
    }

    if (raw.startsWith("+")) {
      lines.push({ type: "added", content: raw.slice(1), newLineNo: newLine });
      newLine++;
    } else if (raw.startsWith("-")) {
      lines.push({ type: "removed", content: raw.slice(1), oldLineNo: oldLine });
      oldLine++;
    } else {
      // context line (starts with space or empty)
      lines.push({
        type: "context",
        content: raw.startsWith(" ") ? raw.slice(1) : raw,
        oldLineNo: oldLine,
        newLineNo: newLine,
      });
      oldLine++;
      newLine++;
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Finding inline annotation
// ---------------------------------------------------------------------------

const SEVERITY_STYLES = {
  high: {
    bg: "bg-rose-50 border-rose-300",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    icon: AlertTriangle,
  },
  medium: {
    bg: "bg-amber-50 border-amber-300",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertCircle,
  },
  low: {
    bg: "bg-slate-50 border-slate-300",
    text: "text-slate-600",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Info,
  },
} as const;

function FindingAnnotation({ finding }: { finding: PRReviewFinding }) {
  const sev = (finding.severity in SEVERITY_STYLES
    ? finding.severity
    : "low") as keyof typeof SEVERITY_STYLES;
  const { bg, text, badge, icon: Icon } = SEVERITY_STYLES[sev];

  return (
    <div className={`border-l-4 ${bg} px-4 py-3 my-0.5`} style={{ borderLeftColor: "currentColor" }}>
      <div className={`flex items-start gap-2 ${text}`}>
        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge}`}>
              {finding.severity}
            </span>
          </div>
          <p className="text-xs leading-relaxed">{finding.message}</p>
          {finding.requirement_gap && (
            <p className="text-xs italic opacity-75 mt-1 pl-2 border-l border-current/30">
              {finding.requirement_gap}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiffViewer component
// ---------------------------------------------------------------------------

interface DiffViewerProps {
  patch: string;
  findings?: PRReviewFinding[];
}

export function DiffViewer({ patch, findings = [] }: DiffViewerProps) {
  const lines = useMemo(() => parsePatch(patch), [patch]);

  // Build a map: newLineNo → findings at that line
  const findingsByLine = useMemo(() => {
    const map = new Map<number, PRReviewFinding[]>();
    for (const f of findings) {
      if (f.line_number != null) {
        const existing = map.get(f.line_number) ?? [];
        map.set(f.line_number, [...existing, f]);
      }
    }
    return map;
  }, [findings]);

  // Findings with no line number — shown at the top
  const unanchoredFindings = useMemo(
    () => findings.filter((f) => f.line_number == null),
    [findings]
  );

  if (lines.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-4 py-3">
        No diff content available.
      </p>
    );
  }

  return (
    <div className="text-xs font-mono overflow-x-auto">
      {/* Unanchored findings (no line number) */}
      {unanchoredFindings.map((f) => (
        <FindingAnnotation key={f.id} finding={f} />
      ))}

      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => {
            if (line.type === "hunk-header") {
              return (
                <tr key={idx} className="bg-blue-50/60 border-y border-blue-100">
                  <td className="w-10 text-right pr-2 py-1 text-blue-400 select-none border-r border-blue-100 text-[10px]" />
                  <td className="w-10 text-right pr-2 py-1 text-blue-400 select-none border-r border-blue-100 text-[10px]" />
                  <td className="pl-3 py-1 text-blue-500 text-[10px]">{line.content}</td>
                </tr>
              );
            }

            const isAdded = line.type === "added";
            const isRemoved = line.type === "removed";

            const rowBg = isAdded
              ? "bg-emerald-50 hover:bg-emerald-100/70"
              : isRemoved
              ? "bg-rose-50 hover:bg-rose-100/70"
              : "hover:bg-slate-50/80";

            const linePrefix = isAdded ? "+" : isRemoved ? "-" : " ";
            const prefixColor = isAdded
              ? "text-emerald-600"
              : isRemoved
              ? "text-rose-600"
              : "text-slate-400";

            const lineAnnotations =
              isAdded && line.newLineNo != null
                ? findingsByLine.get(line.newLineNo) ?? []
                : [];

            return (
              <>
                <tr key={idx} className={`group ${rowBg} transition-colors`}>
                  {/* Old line number */}
                  <td className="w-10 text-right pr-3 py-0.5 text-slate-400 select-none border-r border-slate-100 text-[10px] align-top leading-5">
                    {isRemoved ? line.oldLineNo : ""}
                  </td>
                  {/* New line number */}
                  <td className="w-10 text-right pr-3 py-0.5 text-slate-400 select-none border-r border-slate-100 text-[10px] align-top leading-5">
                    {isAdded || line.type === "context" ? line.newLineNo : ""}
                  </td>
                  {/* Code content */}
                  <td className="pl-2 py-0.5 align-top whitespace-pre-wrap break-all leading-5">
                    <span className={`mr-2 select-none ${prefixColor}`}>{linePrefix}</span>
                    <span className={isAdded ? "text-emerald-900" : isRemoved ? "text-rose-900" : "text-slate-700"}>
                      {line.content}
                    </span>
                  </td>
                </tr>

                {/* Inline finding annotations immediately after the triggering line */}
                {lineAnnotations.map((f) => (
                  <tr key={`finding-${f.id}`}>
                    <td colSpan={3} className="p-0">
                      <FindingAnnotation finding={f} />
                    </td>
                  </tr>
                ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
