"use client";

import Link from "next/link";
import { useDashboardSummary } from "@/features/dashboard/api/queries";
import { formatTimeAgo } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  completed: "text-green-600",
  running: "text-blue-600",
  queued: "text-gray-500",
  failed: "text-red-600",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  analysis: "Impact Analysis",
  pr_review: "PR Review",
};

const JOB_TYPE_HREF: Record<string, (id: string) => string> = {
  analysis: (id) => `/analysis/${id}`,
  pr_review: (id) => `/pr-reviews/${id}`,
};

export function DashboardView() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-sm">Loading your workspace...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-red-500 py-12">Failed to load workspace data.</div>;
  }

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">Overview</h1>
        <p className="text-muted mt-2 text-lg">Welcome back. Here is what&apos;s happening across your repositories.</p>
      </header>

      {/* Repository summary */}
      <SectionCard title="Infrastructure">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="Connected Repos" value={data.repositories.total} />
          <StatCard
            label="Ready & Synced"
            value={data.repositories.completed}
            color="text-emerald-600"
          />
          <StatCard
            label="Syncing Now"
            value={data.repositories.syncing}
            color="text-accent"
          />
          <StatCard
            label="Failed Syncs"
            value={data.repositories.failed}
            color="text-rose-600"
          />
        </div>
        <div className="mt-6 pt-4 border-t border-border/40">
          <Link
            href="/repositories"
            className="text-sm font-medium text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
          >
            Manage repositories <span>&rarr;</span>
          </Link>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Jobs */}
        <SectionCard title="Recent Activity">
          <div className="flex flex-col gap-3">
            {data.recentJobs.length === 0 && (
              <div className="text-sm text-muted py-4 text-center">No recent activity.</div>
            )}
            {data.recentJobs.map((job: any) => {
              const href = JOB_TYPE_HREF[job.type]?.(job.id) || "#";
              return (
                <Link
                  key={job.id}
                  href={href}
                  className="group flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-sm border border-transparent hover:border-border/40 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs bg-white group-hover:bg-slate-50 border shadow-sm text-foreground px-2.5 py-1 rounded-md font-medium tracking-wide">
                      {JOB_TYPE_LABELS[job.type] || job.type}
                    </span>
                    <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate max-w-[200px]">{job.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.created_at && (
                      <span className="text-xs text-muted font-normal">
                        {formatTimeAgo(job.created_at)}
                      </span>
                    )}
                    {job.status === "running" && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                    <span
                      className={`text-xs font-semibold capitalize ${STATUS_COLORS[job.status] || "text-muted"}`}
                    >
                      {job.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        {/* Recent Analyses & Drafts */}
        <div className="flex flex-col gap-8">
          <SectionCard title="Recent Analyses">
            <div className="flex flex-col gap-2">
              {data.recentAnalyses.length === 0 && (
                <div className="text-sm text-muted py-4 text-center">No recent analyses.</div>
              )}
              {data.recentAnalyses.map((a: any) => (
                <Link
                  key={a.id}
                  href={`/analysis/${a.id}`}
                  className="group flex flex-col p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-border/40 transition-all"
                >
                  <div className="text-sm text-foreground font-semibold truncate group-hover:text-accent transition-colors">
                    {a.requirement_title}
                  </div>
                  <div className="text-xs text-muted mt-1 font-medium">
                    {a.repository} &middot; {a.impacted_files_count} file{a.impacted_files_count !== 1 ? "s" : ""}
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent PR Reviews">
            <div className="flex flex-col gap-2">
              {(!data.recentPRReviews || data.recentPRReviews.length === 0) && (
                <div className="text-sm text-muted py-4 text-center">No recent PR reviews.</div>
              )}
              {data.recentPRReviews?.map((r: any) => (
                <Link
                  key={r.id}
                  href={`/pr-reviews/${r.id}`}
                  className="group flex flex-col p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-border/40 transition-all"
                >
                  <div className="text-sm text-foreground font-semibold truncate group-hover:text-accent transition-colors">
                    {r.title || `PR #${r.pr_number}`}
                  </div>
                  <div className={`text-xs font-medium capitalize mt-1 ${STATUS_COLORS[r.status] || "text-muted"}`}>
                    {r.status}
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-border/60 shadow-sm p-6">
      <h2 className="text-xl font-bold font-serif text-foreground mb-5 tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-5 px-2 bg-white/40 rounded-xl border border-border/60 shadow-sm">
      <div className={`text-5xl font-bold font-serif mb-2 tracking-tight ${color}`}>{value}</div>
      <div className="text-[11px] font-bold tracking-widest text-muted uppercase">{label}</div>
    </div>
  );
}
