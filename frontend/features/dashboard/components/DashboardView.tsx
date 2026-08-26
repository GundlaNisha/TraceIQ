"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useDashboardSummary } from "@/features/dashboard/api/queries";
import { useRepositories } from "@/features/repositories/api/queries";
import { useRequirements } from "@/features/requirements/api/queries";
import { usePRReviews } from "@/features/pr-reviews/api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import { useWorkspaceSummary } from "@/features/workspace/api/queries";
import { formatTimeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FolderGit2,
  Sparkles,
  Layers,
  Zap,
  GitPullRequest,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Building2,
  ShieldCheck,
  Activity,
  FileCode2,
  SlidersHorizontal,
  RefreshCw,
  TrendingUp,
  User as UserIcon,
  ChevronRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, { badge: string; text: string; dot: string }> = {
  completed: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  running: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500 animate-pulse",
  },
  queued: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  failed: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
};

const JOB_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  analysis: {
    label: "Impact Analysis",
    icon: Zap,
    color: "text-amber-600 bg-amber-50 border-amber-100",
  },
  pr_review: {
    label: "AI PR Review",
    icon: Sparkles,
    color: "text-blue-600 bg-blue-50 border-blue-100",
  },
};

const JOB_TYPE_HREF: Record<string, (id: string) => string> = {
  analysis: (id) => `/analysis/${id}`,
  pr_review: (id) => `/pr-reviews/${id}`,
};

export function DashboardView() {
  const { user } = useUser();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: repos = [] } = useRepositories();
  const { data: requirements = [] } = useRequirements();
  const { data: prReviews = [] } = usePRReviews();
  const { activeWorkspaceId, activeWorkspaceName } = useWorkspaceStore();
  const { data: wsSummary } = useWorkspaceSummary(activeWorkspaceId || "");

  // Time of day greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon"
      : "Good evening";

  const userName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Engineer";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <div className="w-10 h-10 rounded-full border-3 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium">Loading your intelligence dashboard…</p>
      </div>
    );
  }

  // Calculate metrics
  const totalRepos = summary?.repositories?.total ?? repos.length;
  const readyRepos = summary?.repositories?.completed ?? repos.filter((r: any) => r.sync_status === "completed").length;
  const syncingRepos = summary?.repositories?.syncing ?? repos.filter((r: any) => r.sync_status === "syncing").length;
  const failedRepos = summary?.repositories?.failed ?? repos.filter((r: any) => r.sync_status === "failed").length;

  const totalReviews = prReviews.length || summary?.recentPRReviews?.length || 0;
  const totalReqs = requirements.length;
  const totalAnalyses = summary?.recentAnalyses?.length || 0;

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Hero Greeting & Quick Action Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#1B2A4A] to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        {/* Background glow orb */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-accent/40 rounded-full blur-3xl pointer-events-none opacity-60" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/15 backdrop-blur-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                AI Code Intelligence
              </span>
              {activeWorkspaceId ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-300" />
                  {activeWorkspaceName}
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  Personal Workspace
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-white">
              {greeting}, {userName}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Autonomous AI code review, requirement compliance tracking, and AST blast radius analysis across all your repositories.
            </p>
          </div>

          {/* Quick Launch Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Link href="/repositories">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 text-xs font-semibold rounded-xl h-10 px-4 gap-2 backdrop-blur-md"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Add Repo
              </Button>
            </Link>
            <Link href="/requirements">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 text-xs font-semibold rounded-xl h-10 px-4 gap-2 backdrop-blur-md"
              >
                <Layers className="w-4 h-4 text-purple-400" />
                Requirement
              </Button>
            </Link>
            <Link href="/analysis">
              <Button className="bg-accent hover:bg-accent/90 text-white text-xs font-semibold rounded-xl h-10 px-4.5 gap-2 shadow-lg shadow-accent/40 border border-white/10">
                <Zap className="w-4 h-4 text-amber-400" />
                Run Analysis
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Interactive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Repositories */}
        <Link href="/repositories" className="group">
          <div className="bg-white/80 hover:bg-white backdrop-blur-md rounded-2xl p-5 border border-border/60 hover:border-blue-300/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group-hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Indexed Repositories
                </span>
                <div className="text-3xl font-bold font-serif text-foreground mt-1 tracking-tight">
                  {totalRepos}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                <FolderGit2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {readyRepos} Ready
                </div>
                {syncingRepos > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    {syncingRepos} Syncing
                  </div>
                )}
                {failedRepos > 0 && (
                  <div className="flex items-center gap-1 text-rose-600 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    {failedRepos} Failed
                  </div>
                )}
              </div>
              {/* Mini progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{
                    width: `${totalRepos > 0 ? (readyRepos / totalRepos) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-blue-500 h-full"
                  style={{
                    width: `${totalRepos > 0 ? (syncingRepos / totalRepos) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{
                    width: `${totalRepos > 0 ? (failedRepos / totalRepos) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Link>

        {/* Card 2: AI PR Reviews */}
        <Link href="/pr-reviews" className="group">
          <div className="bg-white/80 hover:bg-white backdrop-blur-md rounded-2xl p-5 border border-border/60 hover:border-accent/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group-hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  AI PR Reviews
                </span>
                <div className="text-3xl font-bold font-serif text-foreground mt-1 tracking-tight">
                  {totalReviews}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Active Automation
              </span>
              <span className="text-xs text-muted-foreground group-hover:text-accent flex items-center gap-0.5 transition-colors font-medium">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </Link>

        {/* Card 3: Requirements */}
        <Link href="/requirements" className="group">
          <div className="bg-white/80 hover:bg-white backdrop-blur-md rounded-2xl p-5 border border-border/60 hover:border-purple-300/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group-hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Requirements
                </span>
                <div className="text-3xl font-bold font-serif text-foreground mt-1 tracking-tight">
                  {totalReqs}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Spec version tracking
              </span>
              <span className="text-xs text-muted-foreground group-hover:text-purple-600 flex items-center gap-0.5 transition-colors font-medium">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </Link>

        {/* Card 4: Impact Analyses */}
        <Link href="/analysis" className="group">
          <div className="bg-white/80 hover:bg-white backdrop-blur-md rounded-2xl p-5 border border-border/60 hover:border-amber-300/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group-hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Impact Analyses
                </span>
                <div className="text-3xl font-bold font-serif text-foreground mt-1 tracking-tight">
                  {totalAnalyses}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Blast radius AST engine
              </span>
              <span className="text-xs text-muted-foreground group-hover:text-amber-600 flex items-center gap-0.5 transition-colors font-medium">
                Analyze <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Dual Grid: Activity & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Columns: Core Intelligence Feed */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section: Recent AI PR Reviews */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-border/60 shadow-xs p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-serif text-foreground tracking-tight">
                    Recent AI PR Reviews
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Automated code review & requirement compliance evaluations
                  </p>
                </div>
              </div>
              <Link
                href="/pr-reviews"
                className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {(!summary?.recentPRReviews || summary.recentPRReviews.length === 0) && (
                <div className="py-10 text-center text-muted-foreground bg-slate-50/60 rounded-xl border border-dashed border-border">
                  <GitPullRequest className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No PR reviews yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                    Connect your GitHub repository and open a pull request to trigger autonomous AI code review.
                  </p>
                </div>
              )}

              {summary?.recentPRReviews?.map((r: any) => {
                const statusMeta = STATUS_COLORS[r.status] || STATUS_COLORS.completed;
                return (
                  <Link
                    key={r.id}
                    href={`/pr-reviews/${r.id}`}
                    className="group flex items-start justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-white border border-border/50 hover:border-border hover:shadow-sm transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold font-mono text-accent">
                          PR #{r.pr_number}
                        </span>
                        <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                          {r.title || `Pull Request #${r.pr_number}`}
                        </p>
                      </div>
                      {r.summary && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                          {r.summary}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize flex items-center gap-1 ${statusMeta.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                        {r.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section: Recent Impact Analyses */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-border/60 shadow-xs p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-serif text-foreground tracking-tight">
                    Recent Impact Analyses
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    AST blast radius evaluations and affected codebase files
                  </p>
                </div>
              </div>
              <Link
                href="/analysis"
                className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {(!summary?.recentAnalyses || summary.recentAnalyses.length === 0) && (
                <div className="py-10 text-center text-muted-foreground bg-slate-50/60 rounded-xl border border-dashed border-border">
                  <Zap className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No analyses performed yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                    Select a requirement and repository to evaluate code blast radius and impacted dependencies.
                  </p>
                  <Link href="/analysis">
                    <Button size="sm" variant="outline" className="mt-3 text-xs rounded-xl">
                      Run first analysis
                    </Button>
                  </Link>
                </div>
              )}

              {summary?.recentAnalyses?.map((a: any) => (
                <Link
                  key={a.id}
                  href={`/analysis/${a.id}`}
                  className="group flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-white border border-border/50 hover:border-border hover:shadow-sm transition-all"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                      {a.requirement_title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="font-mono text-slate-600">{a.repository}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md font-medium text-[10px]">
                        <FileCode2 className="w-3 h-3" />
                        {a.impacted_files_count} file{a.impacted_files_count !== 1 ? "s" : ""} impacted
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Realtime Activity Feed & Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Activity Timeline */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-border/60 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <h2 className="text-base font-bold font-serif text-foreground tracking-tight">
                  Realtime Activity
                </h2>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted">
                Timeline
              </span>
            </div>

            <div className="space-y-3">
              {(!summary?.recentJobs || summary.recentJobs.length === 0) && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No recent activity recorded.
                </div>
              )}

              {summary?.recentJobs?.map((job: any) => {
                const href = JOB_TYPE_HREF[job.type]?.(job.id) || "#";
                const typeMeta = JOB_TYPE_META[job.type] || {
                  label: job.type,
                  icon: Activity,
                  color: "text-slate-600 bg-slate-50 border-slate-100",
                };
                const Icon = typeMeta.icon;
                const statusMeta = STATUS_COLORS[job.status] || STATUS_COLORS.completed;

                return (
                  <Link
                    key={job.id}
                    href={href}
                    className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-border/40"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${typeMeta.color} mt-0.5`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          {typeMeta.label}
                        </span>
                        {job.created_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatTimeAgo(job.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors truncate mt-0.5">
                        {job.label}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                        <span className={`text-[10px] font-medium capitalize ${statusMeta.text}`}>
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Navigation / Feature Hub */}
          <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-2xl border border-border/60 shadow-xs p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Code Intelligence Modules
            </h3>

            <Link
              href="/traceability"
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-100/80 border border-border/50 shadow-2xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                    Traceability Matrix
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    End-to-end requirement to code mapping
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/pull-requests"
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-100/80 border border-border/50 shadow-2xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <GitPullRequest className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                    Pull Requests
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Inspect incoming pull requests & diffs
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/workspaces"
              className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-100/80 border border-border/50 shadow-2xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                    Workspace Collaboration
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Team permissions, invites & shared assets
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
