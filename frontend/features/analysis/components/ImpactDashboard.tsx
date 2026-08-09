"use client";
import { useState } from "react";
import { useJobPoll } from "@/hooks/useJobPoll";
import { useImpactResult } from "../api/queries";
import { DependencyGraph } from "./DependencyGraph";

interface Props {
  jobId: string;
}

export function ImpactDashboard({ jobId }: Props) {
  const { data: job } = useJobPoll(jobId);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "graph">("files");

  // Only fetch the full result once the job is done
  const { data: result, isLoading: resultLoading } = useImpactResult(
    job?.status === "completed" ? jobId : null, // use job_id as analysis_id in mock; real API may differ
  );

  // ── Loading / error states ───────────────────────────────────────────────

  if (!job) {
    return (
      <div className="text-sm text-gray-400 py-12 text-center">
        Loading job...
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="text-red-500 font-medium">Analysis failed</div>
        <p className="text-sm text-gray-500">
          Something went wrong during analysis. Check the job logs or try again.
        </p>
        <button
          className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Progress bar (while running/queued) ──────────────────────────────────

  if (job.status !== "completed") {
    return (
      <div className="flex flex-col items-center gap-6 py-16 max-w-md mx-auto">
        <div className="text-gray-700 font-medium">
          {job.status === "queued"
            ? "Queued for analysis..."
            : "Analyzing your codebase..."}
        </div>
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progress</span>
            <span>{job.progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">
          TraceIQ is retrieving relevant code and running impact analysis. This
          usually takes 15–30 seconds.
        </p>
      </div>
    );
  }

  // ── Completed — show results ──────────────────────────────────────────────

  if (resultLoading || !result) {
    return (
      <div className="text-sm text-gray-400 py-12 text-center">
        Loading results...
      </div>
    );
  }

  const sortedFiles = [...result.impacted_files].sort(
    (a, b) => b.confidence - a.confidence,
  );
  const selected =
    sortedFiles.find((f) => f.file_path === selectedFile) ?? sortedFiles[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "files"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("files")}
        >
          Impacted Files ({sortedFiles.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "graph"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("graph")}
        >
          Dependency Graph
        </button>
      </div>

      {activeTab === "files" && (
        <div className="flex gap-6 h-[calc(100vh-14rem)]">
          {/* Left: file list */}
          <div className="w-80 flex flex-col gap-2 overflow-auto">
            {sortedFiles.map((file) => (
              <button
                key={file.file_path}
                onClick={() => setSelectedFile(file.file_path)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  file.file_path === (selectedFile ?? sortedFiles[0].file_path)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-700 truncate">
                    {file.file_path}
                  </span>
                  <ConfidenceBadge value={file.confidence} />
                </div>
                {file.related_tests.length > 0 && (
                  <div className="text-xs text-gray-400">
                    {file.related_tests.length} related test
                    {file.related_tests.length > 1 ? "s" : ""}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 bg-white rounded-lg border p-5 overflow-auto">
            {selected && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-semibold font-mono text-gray-900">
                    {selected.file_path}
                  </h2>
                  <ConfidenceBadge value={selected.confidence} />
                </div>

                <Section title="AI Reasoning">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selected.reasoning}
                  </p>
                </Section>

                {selected.related_symbols.length > 0 && (
                  <Section title="Related Symbols">
                    <div className="flex flex-wrap gap-2">
                      {selected.related_symbols.map((s) => (
                        <code
                          key={s}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono"
                        >
                          {s}
                        </code>
                      ))}
                    </div>
                  </Section>
                )}

                {selected.related_tests.length > 0 && (
                  <Section title="Related Tests">
                    <div className="flex flex-col gap-1">
                      {selected.related_tests.map((t) => (
                        <div
                          key={t}
                          className="text-xs font-mono text-blue-600"
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {selected.related_tests.length === 0 && (
                  <Section title="Related Tests">
                    <p className="text-xs text-yellow-600 bg-yellow-50 rounded px-3 py-2">
                      No related tests found. Consider adding tests for this
                      file before implementing.
                    </p>
                  </Section>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "graph" && result.dependency_graph && (
        <div className="h-[calc(100vh-14rem)]">
          <DependencyGraph
            nodes={result.dependency_graph.nodes}
            edges={result.dependency_graph.edges}
          />
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80
      ? "bg-red-100 text-red-700"
      : pct >= 60
        ? "bg-yellow-100 text-yellow-700"
        : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${color}`}
    >
      {pct}%
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
