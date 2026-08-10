"use client";
import Link from "next/link";
import { useDashboardSummary } from "@/features/dashboard/api/queries";

const STATUS_COLORS: Record<string, string> = {
  completed: "text-green-600",
  running: "text-blue-600",
  queued: "text-gray-500",
  failed: "text-red-600",
  generated: "text-gray-600",
  edited: "text-blue-600",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  analysis: "Analysis",
  review: "Review",
  pr_draft: "PR Draft",
};

export default function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (!data) {
    return <div>Failed to load dashboard</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      {/* Repository summary */}
      <SectionCard title="Repositories">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total" value={data.repositories.total} />
          <StatCard
            label="Ready"
            value={data.repositories.completed}
            color="text-green-600"
          />
          <StatCard
            label="Syncing"
            value={data.repositories.syncing}
            color="text-blue-600"
          />
          <StatCard
            label="Failed"
            value={data.repositories.failed}
            color="text-red-600"
          />
        </div>
        <Link
          href="/repositories"
          className="text-xs text-blue-600 hover:underline mt-3 inline-block"
        >
          Manage repositories →
        </Link>
      </SectionCard>

      {/* Recent jobs */}
      <SectionCard title="Recent Jobs">
        <div className="flex flex-col gap-2">
          {data.recentJobs.map((job: any) => (
            <div
              key={job.id}
              className="flex items-center justify-between py-1.5 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                  {JOB_TYPE_LABELS[job.type]}
                </span>
                <span className="text-sm text-gray-700">{job.label}</span>
              </div>
              <span
                className={`text-xs font-medium ${STATUS_COLORS[job.status]}`}
              >
                {job.status}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent analyses */}
        <SectionCard title="Recent Analyses">
          <div className="flex flex-col gap-2">
            {data.recentAnalyses.map((a: any) => (
              <Link
                key={a.id}
                href={`/analysis/${a.id}`}
                className="block hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
              >
                <div className="text-sm text-gray-800 font-medium truncate">
                  {a.requirement_title}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {a.repository} · {a.impacted_files_count} file
                  {a.impacted_files_count !== 1 ? "s" : ""}
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        {/* Recent PR drafts */}
        <SectionCard title="Recent PR Drafts">
          <div className="flex flex-col gap-2">
            {data.recentPRDrafts.map((d: any) => (
              <Link
                key={d.id}
                href={`/pr-drafts/${d.id}`}
                className="block hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
              >
                <div className="text-sm text-gray-800 font-medium truncate">
                  {d.title}
                </div>
                <div className={`text-xs mt-0.5 ${STATUS_COLORS[d.status]}`}>
                  {d.status}
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
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
    <div className="bg-white rounded-lg border p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
