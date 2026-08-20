"use client";
import { useState, useMemo } from "react";
import { useJobPoll } from "@/hooks/useJobPoll";
import { useImpactResult, useTriggerAnalysis } from "../api/queries";
import { DependencyGraph, type ImpactedFileItem } from "./DependencyGraph";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Layers,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Code2,
  Beaker,
  Network,
  RotateCw,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  jobId: string;
}

export function ImpactDashboard({ jobId }: Props) {
  const { data: job } = useJobPoll(jobId);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "graph">("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const { mutate: reAnalyze, isPending: isReanalyzing } = useTriggerAnalysis();
  const router = useRouter();

  // Fetch full analysis result once completed
  const { data: result, isLoading: resultLoading } = useImpactResult(
    job?.status === "completed" ? jobId : null,
  );

  const filesArray: ImpactedFileItem[] = useMemo(() => {
    if (!result) return [];
    if (Array.isArray(result.impacted_files)) return result.impacted_files;
    if (Array.isArray(result.impacted_files?.impacted_files)) {
      return result.impacted_files.impacted_files;
    }
    return [];
  }, [result]);

  const sortedFiles = useMemo(() => {
    return [...filesArray].sort((a, b) => b.confidence - a.confidence);
  }, [filesArray]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return sortedFiles;
    const q = searchQuery.toLowerCase();
    return sortedFiles.filter(
      (f) =>
        f.file_path.toLowerCase().includes(q) ||
        f.related_symbols?.some((s) => s.toLowerCase().includes(q)) ||
        f.related_tests?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [sortedFiles, searchQuery]);

  const selected = useMemo(() => {
    if (selectedFile) {
      const found = sortedFiles.find((f) => f.file_path === selectedFile);
      if (found) return found;
    }
    return sortedFiles[0] || null;
  }, [selectedFile, sortedFiles]);

  const highImpactCount = sortedFiles.filter((f) => f.confidence >= 0.6).length;
  const totalSymbols = sortedFiles.reduce((acc, f) => acc + (f.related_symbols?.length || 0), 0);
  const totalTests = sortedFiles.reduce((acc, f) => acc + (f.related_tests?.length || 0), 0);

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium">Loading analysis job...</p>
      </div>
    );
  }

  // ── Failed state ───────────────────────────────────────────────────────────
  if (job.status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center max-w-md mx-auto">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-2">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold font-serif text-foreground">Analysis Failed</h2>
        <p className="text-sm text-muted">
          Something went wrong during repository indexing or impact retrieval.
        </p>
        {job.requirement_id && (
          <Button
            onClick={() => {
              reAnalyze(job.requirement_id!, {
                onSuccess: (data) => router.push(`/analysis/${data.job_id}`),
              });
            }}
            disabled={isReanalyzing}
            className="gap-2 mt-2"
          >
            <RotateCw className={`w-4 h-4 ${isReanalyzing ? "animate-spin" : ""}`} />
            {isReanalyzing ? "Re-triggering..." : "Retry Analysis"}
          </Button>
        )}
      </div>
    );
  }

  // ── Progress bar (while running/queued) ────────────────────────────────────
  if (job.status !== "completed") {
    return (
      <div className="flex flex-col items-center gap-6 py-24 max-w-md mx-auto">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-2">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold font-serif text-foreground">
            {job.status === "queued" ? "Queued for Analysis" : "Analyzing Blast Radius"}
          </h2>
          <p className="text-xs text-muted mt-1">
            Evaluating code dependencies and tracing requirement impact across the repository.
          </p>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-border/40">
          <div
            className="bg-accent h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${Math.max(job.progress || 10, 10)}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full text-xs text-muted font-medium">
          <span>{job.status === "queued" ? "Waiting for Celery worker" : "Semantic code retrieval"}</span>
          <span>{job.progress}%</span>
        </div>
      </div>
    );
  }

  // ── Completed loading guard ───────────────────────────────────────────────
  if (resultLoading || !result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium">Preparing impact summary...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Back Navigation */}
      <Link
        href="/analysis"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-max font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Analysis Jobs
      </Link>

      {/* Hero Header Card */}
      <div className="bg-white/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm p-6 md:p-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-7 h-7 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                  Requirement Impact
                </span>
                {job.repository_name && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                    {job.repository_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Analysis Complete
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold font-serif text-foreground tracking-tight line-clamp-2">
                {job.requirement_title || "Requirement Impact Analysis"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start">
            <Link href="/pull-requests">
              <Button
                size="sm"
                className="gap-2 shadow-sm font-semibold text-xs h-9 px-4 bg-accent hover:bg-accent/90 text-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Go to Pull Requests &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border/40">
          <div className="bg-slate-50/60 rounded-xl p-3 border border-border/40">
            <p className="text-xs text-muted font-medium">Impacted Files</p>
            <p className="text-2xl font-bold font-serif text-foreground mt-0.5">
              {sortedFiles.length}
            </p>
          </div>
          <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
            <p className="text-xs text-rose-700 font-medium">High Risk (&ge;60%)</p>
            <p className="text-2xl font-bold font-serif text-rose-700 mt-0.5">
              {highImpactCount}
            </p>
          </div>
          <div className="bg-slate-50/60 rounded-xl p-3 border border-border/40">
            <p className="text-xs text-muted font-medium">Related Symbols</p>
            <p className="text-2xl font-bold font-serif text-foreground mt-0.5">
              {totalSymbols}
            </p>
          </div>
          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
            <p className="text-xs text-emerald-700 font-medium">Related Test Suites</p>
            <p className="text-2xl font-bold font-serif text-emerald-700 mt-0.5">
              {totalTests}
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="bg-slate-100/80 p-1.5 rounded-xl inline-flex gap-1 border border-border/40 select-none">
          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "files"
                ? "bg-white text-accent shadow-xs border border-border/50"
                : "text-muted hover:text-foreground hover:bg-black/5"
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            Impacted Files ({sortedFiles.length})
          </button>
          <button
            onClick={() => setActiveTab("graph")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "graph"
                ? "bg-white text-accent shadow-xs border border-border/50"
                : "text-muted hover:text-foreground hover:bg-black/5"
            }`}
          >
            <Network className="w-4 h-4" />
            Dependency & Blast Radius Graph
          </button>
        </div>

        {activeTab === "files" && (
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Filter files, symbols, tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/80 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
        )}
      </div>

      {/* TAB 1: Impacted Files Explorer */}
      {activeTab === "files" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
          {/* Left Column: File List */}
          <div className="lg:col-span-5 flex flex-col gap-2.5 max-h-[700px] overflow-y-auto pr-1">
            {filteredFiles.length === 0 ? (
              <div className="p-8 text-center bg-white/60 rounded-2xl border border-border/40 text-muted text-sm">
                No matching files found.
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = selected?.file_path === file.file_path;
                const fileName = file.file_path.split("/").pop() || file.file_path;
                const dirPath = file.file_path.includes("/")
                  ? file.file_path.substring(0, file.file_path.lastIndexOf("/"))
                  : "";
                const pct = Math.round(file.confidence * 100);

                return (
                  <div
                    key={file.file_path}
                    onClick={() => setSelectedFile(file.file_path)}
                    className={`flex flex-col gap-2.5 p-4 rounded-2xl border transition-all duration-150 cursor-pointer text-left select-none ${
                      isSelected
                        ? "bg-accent/5 border-accent shadow-xs ring-1 ring-accent/30"
                        : "bg-white/80 border-border/40 hover:bg-white hover:border-border/80 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {dirPath && (
                          <p className="text-[11px] font-mono text-muted truncate mb-0.5">
                            {dirPath}/
                          </p>
                        )}
                        <h4 className="text-sm font-mono font-bold text-foreground truncate">
                          {fileName}
                        </h4>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold shrink-0 ${
                          pct >= 60
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : pct >= 40
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 60 ? "bg-rose-500" : pct >= 40 ? "bg-amber-500" : "bg-slate-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                      <span>{file.related_symbols?.length || 0} symbols</span>
                      <span>&bull;</span>
                      <span>{file.related_tests?.length || 0} tests</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: File Detail Inspection */}
          <div className="lg:col-span-7 bg-white/90 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm p-6 md:p-8 flex flex-col gap-6 self-start min-h-[500px]">
            {selected ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-border/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          selected.confidence >= 0.6
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {selected.confidence >= 0.6 ? "High Blast Radius" : "Moderate Blast Radius"}
                      </span>
                      <span className="text-xs font-mono text-muted">
                        Confidence: {Math.round(selected.confidence * 100)}%
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-mono font-bold text-foreground break-all">
                      {selected.file_path}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleCopyPath(selected.file_path)}
                    className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-slate-100 transition-colors shrink-0"
                    title="Copy File Path"
                  >
                    {copiedPath === selected.file_path ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* AI Reasoning */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    AI Architectural Reasoning
                  </h4>
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-border/50 text-sm text-foreground/90 leading-relaxed font-sans">
                    {selected.reasoning || "File likely requires modification to implement requirement acceptance criteria."}
                  </div>
                </div>

                {/* Related Symbols */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                    Affected Functions & Symbols ({selected.related_symbols?.length || 0})
                  </h4>
                  {selected.related_symbols && selected.related_symbols.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selected.related_symbols.map((sym) => (
                        <div
                          key={sym}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-border/60 text-xs font-mono font-semibold text-slate-800 shadow-2xs"
                        >
                          <span className="text-indigo-500 font-bold">&fnof;</span>
                          {sym}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted italic">No specific functions flagged.</p>
                  )}
                </div>

                {/* Related Tests */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                    <Beaker className="w-3.5 h-3.5 text-emerald-500" />
                    Verification & Test Suites ({selected.related_tests?.length || 0})
                  </h4>
                  {selected.related_tests && selected.related_tests.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {selected.related_tests.map((test) => (
                        <div
                          key={test}
                          className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/60 text-xs font-mono font-medium text-emerald-900"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{test}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        No existing unit tests found for this component. Consider adding test cases before merging.
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted">
                <FileCode2 className="w-8 h-8 mb-2 text-border" />
                <p className="text-sm font-medium">Select a file to view detailed impact analysis</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Dependency & Blast Radius Graph */}
      {activeTab === "graph" && (
        <div className="h-[650px] w-full">
          <DependencyGraph
            requirementTitle={job.requirement_title || "Requirement Impact Scope"}
            impactedFiles={sortedFiles}
          />
        </div>
      )}
    </div>
  );
}
