"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTraceabilityMatrix } from "../api/queries";
import { useRepositories } from "@/features/repositories/api/queries";
import { formatTimeAgo, formatDateTime } from "@/lib/utils";
import type { TraceabilityRow, TraceabilityReviewItem, Repository } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  Search,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitPullRequest,
  Layers,
  ArrowUpRight,
  Filter,
  FileCode2,
  Flame,
  ShieldCheck,
  History,
  FileText,
  GitCommit,
  CheckCircle,
} from "lucide-react";

const STATUS_CONFIG = {
  verified: {
    label: "Verified Compliant",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    icon: CheckCircle2,
    desc: "PR implementation satisfies requirement with 0 high-severity gaps",
  },
  gaps_flagged: {
    label: "Gaps Flagged",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/60",
    icon: AlertTriangle,
    desc: "AI review detected requirement gaps or robustness issues to fix",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/60 animate-pulse",
    icon: Clock,
    desc: "Impact analysis or PR review job currently evaluating",
  },
  pending_verification: {
    label: "Pending Verification",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200/60",
    icon: HelpCircle,
    desc: "Requirement defined; awaiting PR implementation & review",
  },
} as const;

export function TraceabilityMatrix() {
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedReqId, setCopiedReqId] = useState<string | null>(null);

  const { data: matrixData, isLoading, isError } = useTraceabilityMatrix(
    selectedRepoId ? selectedRepoId : null
  );
  const { data: repos = [] } = useRepositories();

  const toggleRow = (reqId: string) => {
    setExpandedRows((prev) => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const filteredItems = useMemo(() => {
    if (!matrixData?.items) return [];

    return matrixData.items.filter((item: TraceabilityRow) => {
      // Status filter
      if (statusFilter !== "all" && item.compliance_status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchText = item.text.toLowerCase().includes(q);
        const matchRepo = item.repository_name.toLowerCase().includes(q);
        const matchPR = item.reviews.some(
          (r) =>
            r.pr_title.toLowerCase().includes(q) ||
            String(r.pr_number).includes(q)
        );
        if (!matchTitle && !matchText && !matchRepo && !matchPR) {
          return false;
        }
      }

      return true;
    });
  }, [matrixData, statusFilter, searchQuery]);

  const handleCopyReqText = (reqId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReqId(reqId);
    setTimeout(() => setCopiedReqId(null), 1800);
  };

  const handleExportCSV = () => {
    if (!matrixData?.items?.length) return;
    const headers = [
      "Requirement ID",
      "Title",
      "Version",
      "Repository",
      "Compliance Status",
      "Compliance Score",
      "Impacted Files Count",
      "Linked PRs",
      "High Severity Findings",
      "Medium Severity Findings",
      "Requirement Gaps",
    ];

    const rows = matrixData.items.map((item) => {
      const uniquePRs = Array.from(new Set(item.reviews.map((r) => `#${r.pr_number}`))).join(" | ");
      const totalHigh = item.reviews.reduce((sum, r) => sum + r.finding_counts.high, 0);
      const totalMed = item.reviews.reduce((sum, r) => sum + r.finding_counts.medium, 0);
      const totalGaps = item.reviews.reduce((sum, r) => sum + r.finding_counts.gaps_count, 0);

      return [
        item.requirement_id,
        `"${item.title.replace(/"/g, '""')}"`,
        `v${item.version_number}`,
        item.repository_name,
        item.compliance_status,
        `${item.compliance_score}%`,
        item.latest_analysis?.impacted_files_count ?? 0,
        `"${uniquePRs}"`,
        totalHigh,
        totalMed,
        totalGaps,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `traceability-matrix-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyMarkdown = () => {
    if (!matrixData?.items?.length) return;
    const summary = matrixData.summary;
    let md = `# TraceIQ Traceability & Compliance Matrix\n`;
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    md += `### Summary\n`;
    md += `- **Total Requirements**: ${summary.total_requirements}\n`;
    md += `- **Verified Compliant**: ${summary.verified_count}\n`;
    md += `- **Gaps Flagged**: ${summary.gaps_count}\n`;
    md += `- **Pending Verification**: ${summary.pending_count}\n`;
    md += `- **Compliance Pass Rate**: ${summary.total_requirements > 0 ? Math.round((summary.verified_count / summary.total_requirements) * 100) : 0}%\n\n`;
    md += `| Requirement | Repo | Compliance | Score | Impacted Files | Linked PRs |\n`;
    md += `|---|---|---|---|---|---|\n`;

    matrixData.items.forEach((item) => {
      const prs = Array.from(new Set(item.reviews.map((r) => `#${r.pr_number}`))).join(", ") || "None";
      md += `| **v${item.version_number}: ${item.title}** | ${item.repository_name} | ${item.compliance_status.toUpperCase()} | ${item.compliance_score}% | ${item.latest_analysis?.impacted_files_count ?? 0} files | ${prs} |\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-28 text-center text-muted animate-pulse flex flex-col items-center gap-3">
        <Sparkles className="w-8 h-8 text-accent animate-spin" />
        <p className="font-semibold text-foreground">Computing Traceability & Compliance Matrix…</p>
        <p className="text-xs text-muted-foreground">Connecting requirements, impact blast radiuses, and PR review audits</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-100 p-8">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
        <p className="font-semibold text-lg">Failed to load Traceability Matrix</p>
        <p className="text-xs text-rose-500/80 mt-1">Please check API connectivity and try again.</p>
      </div>
    );
  }

  const summary = matrixData?.summary ?? {
    total_requirements: 0,
    verified_count: 0,
    gaps_count: 0,
    in_progress_count: 0,
    pending_count: 0,
    overall_coverage_pct: 0,
  };

  const verifiedPercentage = summary.total_requirements > 0
    ? Math.round((summary.verified_count / summary.total_requirements) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-7 max-w-[1400px] mx-auto w-full">
      {/* Hero Header */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent mb-2">
            <Layers className="w-3.5 h-3.5" />
            End-to-End Requirement Traceability
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">
            Traceability Matrix
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl leading-relaxed">
            Audit how business requirements translate into code changes, blast radius predictions, and verified pull request reviews.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="gap-1.5 text-xs font-semibold shadow-none"
          >
            {copiedMarkdown ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedMarkdown ? "Copied Markdown!" : "Copy Summary"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs font-semibold shadow-none"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Requirements</div>
          <div className="text-3xl font-serif font-bold text-foreground mt-2">{summary.total_requirements}</div>
          <div className="text-xs text-muted-foreground mt-1">Tracked across repositories</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Compliant
          </div>
          <div className="text-3xl font-serif font-bold text-emerald-700 mt-2">{summary.verified_count}</div>
          <div className="text-xs text-muted-foreground mt-1">0 high severity gaps</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Gaps Flagged
          </div>
          <div className="text-3xl font-serif font-bold text-amber-700 mt-2">{summary.gaps_count}</div>
          <div className="text-xs text-muted-foreground mt-1">Requires code refinement</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Pending Review
          </div>
          <div className="text-3xl font-serif font-bold text-slate-700 mt-2">{summary.pending_count}</div>
          <div className="text-xs text-muted-foreground mt-1">Awaiting PR evaluation</div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 p-5 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Compliance Rate
          </div>
          <div className="text-3xl font-serif font-bold text-accent mt-2">{verifiedPercentage}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-accent h-full rounded-full transition-all duration-500"
              style={{ width: `${verifiedPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Toolbar: Filters & Search */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-border/50 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {[
            { id: "all", label: "All Requirements" },
            { id: "verified", label: "Verified" },
            { id: "gaps_flagged", label: "Gaps Flagged" },
            { id: "in_progress", label: "In Progress" },
            { id: "pending_verification", label: "Pending" },
          ].map((pill) => {
            const isActive = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-slate-100/80 text-muted-foreground hover:text-foreground hover:bg-slate-100"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Repository Filter & Search Input */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
          >
            <option value="">All Repositories</option>
            {repos.map((r: Repository) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matrix…"
              className="pl-8 text-xs h-8 rounded-xl bg-slate-50 border-border"
            />
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center bg-white/60 rounded-2xl border border-border/50 shadow-sm flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-muted-foreground">
            <Filter className="w-6 h-6" />
          </div>
          <p className="text-foreground text-base font-semibold">No matrix entries match your filters</p>
          <p className="text-xs text-muted-foreground">Try selecting a different status or clearing your search query.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-md shadow-sm overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50/70 border-b border-border/40">
              <tr>
                <th className="w-10 px-4 py-4" />
                <th className="text-left px-5 py-4 font-semibold text-muted text-xs tracking-wider uppercase min-w-[280px]">
                  Requirement
                </th>
                <th className="text-left px-5 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                  Repository
                </th>
                <th className="text-left px-5 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                  Impact Blast Radius
                </th>
                <th className="text-left px-5 py-4 font-semibold text-muted text-xs tracking-wider uppercase min-w-[220px]">
                  Linked PR Reviews
                </th>
                <th className="text-left px-5 py-4 font-semibold text-muted text-xs tracking-wider uppercase">
                  Compliance Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: TraceabilityRow) => {
                const isExpanded = Boolean(expandedRows[item.requirement_id]);
                const statusCfg =
                  STATUS_CONFIG[item.compliance_status] ?? STATUS_CONFIG.pending_verification;
                const StatusIcon = statusCfg.icon;
                const groupedPRs = groupPRReviews(item.reviews);

                return (
                  <FragmentWrapper key={item.requirement_id}>
                    {/* Main Row */}
                    <tr
                      className={`border-b border-border/40 transition-colors cursor-pointer ${
                        isExpanded
                          ? "bg-accent/[0.04] border-b-0"
                          : "hover:bg-slate-50/60"
                      }`}
                      onClick={() => toggleRow(item.requirement_id)}
                    >
                      {/* Chevron Button */}
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          className={`p-1.5 rounded-lg transition-colors ${
                            isExpanded ? "bg-accent/15 text-accent" : "hover:bg-slate-200/60 text-muted-foreground"
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Requirement Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-bold shrink-0">
                            v{item.version_number}
                          </span>
                          <h4 className="font-semibold text-foreground truncate max-w-sm" title={item.title}>
                            {item.title}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">{item.text}</p>
                        <div className="text-[11px] text-muted-foreground/70 mt-1">
                          Updated {formatTimeAgo(item.created_at)}
                        </div>
                      </td>

                      {/* Repository */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-foreground text-xs">{item.repository_name}</span>
                      </td>

                      {/* Impact Blast Radius */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        {item.latest_analysis ? (
                          <Link
                            href={`/analysis/${item.latest_analysis.id}`}
                            className="inline-flex flex-col gap-1 group/link hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-1 border border-blue-200/50">
                                <FileCode2 className="w-3.5 h-3.5" />
                                {item.latest_analysis.impacted_files_count} file{item.latest_analysis.impacted_files_count !== 1 ? "s" : ""}
                              </span>
                              {item.latest_analysis.high_risk_count > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold flex items-center gap-0.5 border border-rose-200/50">
                                  <Flame className="w-3 h-3" /> {item.latest_analysis.high_risk_count} High
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                              Analyzed {formatTimeAgo(item.latest_analysis.created_at)}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity text-accent" />
                            </span>
                          </Link>
                        ) : (
                          <Link
                            href="/analysis"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-semibold"
                          >
                            Run Analysis <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </td>

                      {/* Linked PR Reviews */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        {groupedPRs.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {groupedPRs.slice(0, 2).map(({ prNumber, latestReview, totalIterations }) => (
                              <div key={`pr-${prNumber}`} className="flex items-center gap-2">
                                <Link
                                  href={`/pr-reviews/${latestReview.id}`}
                                  className="group/pr inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-accent transition-colors truncate max-w-[180px]"
                                  title={`PR #${prNumber}: ${latestReview.pr_title}`}
                                >
                                  <GitPullRequest className="w-3.5 h-3.5 text-accent shrink-0" />
                                  <span className="truncate">PR #{prNumber}</span>
                                </Link>

                                <div className="flex items-center gap-1 shrink-0">
                                  {latestReview.finding_counts.gaps_count > 0 ? (
                                    <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200/60">
                                      {latestReview.finding_counts.gaps_count} Gap{latestReview.finding_counts.gaps_count !== 1 ? "s" : ""}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200/60">
                                      Pass
                                    </span>
                                  )}
                                  {totalIterations > 1 && (
                                    <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-medium" title={`${totalIterations} review iterations run`}>
                                      {totalIterations}x
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {groupedPRs.length > 2 && (
                              <span className="text-[11px] text-muted-foreground">
                                +{groupedPRs.length - 2} more PRs
                              </span>
                            )}
                          </div>
                        ) : (
                          <Link
                            href="/pull-requests"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                          >
                            No PR linked <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </td>

                      {/* Compliance Status & Progress Bar */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.compliance_score >= 85
                                    ? "bg-emerald-500"
                                    : item.compliance_score >= 50
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                                }`}
                                style={{ width: `${item.compliance_score}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {item.compliance_score}%
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Integrated Inspection Drawer: Balanced 2-Column Split View */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-b border-border/60">
                        <td colSpan={6} className="p-4 sm:p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* Left Column (5/12): Stated Scope & Blast Radius */}
                            <div className="lg:col-span-5 flex flex-col gap-4">
                              {/* Stated Requirement Card */}
                              <div className="p-5 rounded-2xl bg-white border border-border/70 shadow-sm flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-3">
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-mono text-xs font-bold">
                                        v{item.version_number} Scope
                                      </span>
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {item.repository_name}
                                      </span>
                                    </div>
                                    <h4 className="text-base font-serif font-bold text-foreground leading-snug">
                                      {item.title}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      Created {formatDateTime(item.created_at)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyReqText(item.requirement_id, item.text)}
                                    className="gap-1.5 text-xs font-medium h-7 px-2.5 shadow-none shrink-0"
                                  >
                                    {copiedReqId === item.requirement_id ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    {copiedReqId === item.requirement_id ? "Copied!" : "Copy"}
                                  </Button>
                                </div>

                                <div>
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-accent" /> Acceptance Criteria
                                  </div>
                                  <div className="p-3.5 rounded-xl bg-slate-50/80 border-l-4 border-accent text-foreground text-xs leading-relaxed font-mono whitespace-pre-wrap border-y border-r border-border/40 max-h-48 overflow-y-auto">
                                    {item.text}
                                  </div>
                                </div>
                              </div>

                              {/* Predicted Blast Radius Card */}
                              <div className="p-5 rounded-2xl bg-white border border-border/70 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <FileCode2 className="w-3.5 h-3.5 text-blue-600" /> Predicted Blast Radius
                                  </div>
                                  {item.latest_analysis && (
                                    <Link
                                      href={`/analysis/${item.latest_analysis.id}`}
                                      className="text-xs text-accent hover:underline font-semibold inline-flex items-center gap-0.5"
                                    >
                                      View Graph <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                  )}
                                </div>

                                {item.latest_analysis ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/50">
                                        {item.latest_analysis.impacted_files_count} Impacted File{item.latest_analysis.impacted_files_count !== 1 ? "s" : ""}
                                      </span>
                                      {item.latest_analysis.high_risk_count > 0 ? (
                                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1 border border-rose-200/50">
                                          <Flame className="w-3 h-3" /> {item.latest_analysis.high_risk_count} High Risk Files
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 border border-emerald-200/50">
                                          <CheckCircle className="w-3 h-3" /> Low Blast Radius
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                      Analysis completed {formatTimeAgo(item.latest_analysis.created_at)}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="py-2 text-center flex flex-col items-center gap-1.5">
                                    <p className="text-xs text-muted-foreground">No impact analysis run for this version yet.</p>
                                    <Link href="/analysis">
                                      <Button size="sm" variant="outline" className="text-xs gap-1 h-7 font-medium mt-1">
                                        Run Impact Analysis <ArrowUpRight className="w-3 h-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Column (7/12): Verified Pull Request Findings & Audit Reports */}
                            <div className="lg:col-span-7 flex flex-col gap-4">
                              <div className="p-5 rounded-2xl bg-white border border-border/70 shadow-sm flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
                                  <div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <GitPullRequest className="w-3.5 h-3.5 text-accent" /> Pull Request Review Audits
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {groupedPRs.length > 0
                                        ? `${groupedPRs.length} Pull Request${groupedPRs.length !== 1 ? "s" : ""} verified against this requirement`
                                        : "Awaiting PR review execution"}
                                    </p>
                                  </div>
                                  <Link href="/pull-requests">
                                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7 font-semibold">
                                      Review PR <ArrowUpRight className="w-3 h-3" />
                                    </Button>
                                  </Link>
                                </div>

                                {item.reviews.length === 0 ? (
                                  <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-border/70 flex flex-col items-center gap-2">
                                    <GitCommit className="w-8 h-8 text-muted-foreground/50" />
                                    <p className="text-xs font-medium text-foreground">No pull requests linked to this requirement yet</p>
                                    <p className="text-[11px] text-muted-foreground max-w-sm">
                                      When a developer opens a PR that satisfies this requirement, run an AI PR Review to verify compliance.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-4">
                                    {groupedPRs.map(({ prNumber, latestReview, totalIterations, history }) => (
                                      <div
                                        key={`pr-audit-card-${prNumber}`}
                                        className="p-4 rounded-xl bg-slate-50/60 border border-border/60 flex flex-col gap-3"
                                      >
                                        {/* Card Top: PR info & quick badges */}
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-foreground text-sm">PR #{prNumber}</span>
                                              {totalIterations > 1 && (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center gap-1 border border-border/40">
                                                  <History className="w-3 h-3" /> {totalIterations} iterations
                                                </span>
                                              )}
                                              <span className="text-xs text-muted-foreground">
                                                Reviewed {formatTimeAgo(latestReview.created_at)}
                                              </span>
                                            </div>
                                            <h5 className="text-xs font-semibold text-foreground mt-1">
                                              {latestReview.pr_title}
                                            </h5>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {latestReview.pr_html_url && (
                                              <a
                                                href={latestReview.pr_html_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium px-2 py-1 rounded-lg border border-border/50 bg-white hover:bg-slate-50 transition-colors"
                                              >
                                                GitHub <ExternalLink className="w-3 h-3" />
                                              </a>
                                            )}
                                            <Link
                                              href={`/pr-reviews/${latestReview.id}`}
                                              className="text-xs text-white bg-accent hover:bg-accent/90 inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg shadow-sm transition-colors"
                                            >
                                              Report <ArrowUpRight className="w-3 h-3" />
                                            </Link>
                                          </div>
                                        </div>

                                        {/* AI Summary verdict */}
                                        {latestReview.summary && (
                                          <div className="p-3 rounded-lg bg-white border border-border/40 text-xs text-foreground/90 leading-relaxed font-sans">
                                            <span className="font-semibold text-foreground block mb-1">
                                              AI Compliance Findings:
                                            </span>
                                            <p className="text-muted-foreground text-xs leading-relaxed">
                                              {latestReview.summary}
                                            </p>
                                          </div>
                                        )}

                                        {/* Severity & Gaps Pills */}
                                        <div className="flex items-center justify-between pt-2 border-t border-border/30 flex-wrap gap-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {latestReview.finding_counts.gaps_count > 0 ? (
                                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200/60 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> {latestReview.finding_counts.gaps_count} Requirement Gap{latestReview.finding_counts.gaps_count !== 1 ? "s" : ""}
                                              </span>
                                            ) : (
                                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200/60 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> 0 Requirement Gaps
                                              </span>
                                            )}

                                            {latestReview.finding_counts.high > 0 && (
                                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">
                                                {latestReview.finding_counts.high} High
                                              </span>
                                            )}
                                            {latestReview.finding_counts.medium > 0 && (
                                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium text-xs">
                                                {latestReview.finding_counts.medium} Med
                                              </span>
                                            )}
                                            {latestReview.finding_counts.low > 0 && (
                                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
                                                {latestReview.finding_counts.low} Low
                                              </span>
                                            )}
                                          </div>

                                          <div className="text-[11px] font-semibold text-muted-foreground">
                                            Score: <span className="text-foreground">{item.compliance_score}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </FragmentWrapper>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FragmentWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function groupPRReviews(reviews: TraceabilityReviewItem[]) {
  const map = new Map<number, TraceabilityReviewItem[]>();
  reviews.forEach((r) => {
    const list = map.get(r.pr_number) || [];
    list.push(r);
    map.set(r.pr_number, list);
  });
  return Array.from(map.entries()).map(([prNum, revs]) => ({
    prNumber: prNum,
    latestReview: revs[0], // ordered desc by created_at in backend
    totalIterations: revs.length,
    history: revs,
  }));
}
