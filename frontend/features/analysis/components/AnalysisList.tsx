"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useAnalysisJobs } from "../api/queries";

export function AnalysisList() {
  const { data: jobs, isLoading, isError } = useAnalysisJobs();

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-8">Loading analysis jobs...</div>;
  }
  
  if (isError) {
    return <div className="text-sm text-red-500 py-8">Failed to load analysis jobs.</div>;
  }

  if (!jobs?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-gray-50/50">
        <h3 className="text-sm font-medium text-gray-900 mb-1">No analysis jobs</h3>
        <p className="text-xs text-gray-500 text-center max-w-sm mb-4">
          You haven't run any impact analysis yet. Go to a Requirement and click "Analyze" to run one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/analysis/${job.id}`}
          className="flex items-start justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition-shadow group"
        >
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              Analysis Job
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                job.status === "completed" ? "bg-green-50 text-green-700" :
                job.status === "failed" ? "bg-red-50 text-red-700" :
                "bg-blue-50 text-blue-700"
              }`}>
                {job.status} {job.status !== "completed" && job.status !== "failed" ? `(${job.progress}%)` : ""}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
