"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useAnalysisJobs, useDeleteAnalysisJob } from "../api/queries";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { parseUTCDate } from "@/lib/utils";
import { type AnalysisJob } from "@/lib/types/api";
import { useRouter } from "next/navigation";

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
        <AnalysisJobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

function AnalysisJobCard({ job }: { job: AnalysisJob }) {
  const { mutate: deleteJob, isPending: isDeleting } = useDeleteAnalysisJob();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  return (
    <>
      <div
        onClick={() => router.push(`/analysis/${job.id}`)}
        className="flex items-start justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition-shadow group cursor-pointer"
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            Analysis Job
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{formatDistanceToNow(parseUTCDate(job.created_at), { addSuffix: true })}</span>
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
        <button 
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">Are you sure you want to delete this analysis job? This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={isDeleting}
              onClick={() => {
                deleteJob(job.id, {
                  onSuccess: () => setShowConfirm(false)
                });
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
