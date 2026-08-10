"use client";
import ReactDiffViewer from "react-diff-viewer-continued";
import { useReviewDiff, useReviewFindings } from "../api/queries";
import { type ReviewFinding } from "@/lib/types/api";

const SEVERITY_STYLE = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

interface Props {
  reviewId: string;
}

export function ReviewDashboard({ reviewId }: Props) {
  const { data: diff, isLoading: diffLoading } = useReviewDiff(reviewId);
  const { data: findings, isLoading: findingsLoading } =
    useReviewFindings(reviewId);

  // Sort findings: high → medium → low
  const sortedFindings = [...(findings ?? [])].sort((a: ReviewFinding, b: ReviewFinding) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-10rem)]">
      {/* Left: Diff viewer */}
      <div className="flex-1 overflow-auto rounded-lg border bg-white">
        {diffLoading ? (
          <div className="p-6 text-sm text-gray-400">Loading diff...</div>
        ) : (
          <ReactDiffViewer
            oldValue=""
            newValue={typeof diff === "string" ? diff : ""}
            splitView={false}
            useDarkTheme={false}
          />
        )}
      </div>

      {/* Right: Findings */}
      <div className="w-80 flex flex-col gap-3 overflow-auto">
        <h2 className="text-sm font-semibold text-gray-700">
          AI Findings {findings ? `(${findings.length})` : ""}
        </h2>
        {findingsLoading && (
          <div className="text-sm text-gray-400">Loading findings...</div>
        )}
        {sortedFindings.map((finding: ReviewFinding, i: number) => (
          <div
            key={i}
            className={`rounded-lg border p-3 ${SEVERITY_STYLE[finding.severity as keyof typeof SEVERITY_STYLE]}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase">
                {finding.severity}
              </span>
              {finding.line_number && (
                <span className="text-xs opacity-70">
                  line {finding.line_number}
                </span>
              )}
            </div>
            <div className="text-xs font-mono text-current opacity-80 mb-1">
              {finding.file_path}
            </div>
            <p className="text-xs">{finding.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
