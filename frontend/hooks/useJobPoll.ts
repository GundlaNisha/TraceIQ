import { useQuery } from "@tanstack/react-query";
import { USE_MOCK, API_BASE_URL } from "@/lib/api/config";
import { getMockJob } from "@/lib/mock-data/analysis";

export type JobPollData = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  requirement_id?: string;
  repository_id?: string;
  created_at: string;
};

export function useJobPoll(jobId: string | null) {
  return useQuery<JobPollData>({
    queryKey: ["job", jobId],
    enabled: !!jobId,

    // Stop refetching once the job reaches a terminal state
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000; // poll every 2 seconds while queued or running
    },

    queryFn: async () => {
      if (USE_MOCK) {
        // getMockJob() internally advances progress on each call
        // so the polling hook naturally simulates a job progressing
        return getMockJob(jobId!);
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/analysis/jobs/${jobId}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        // Session expired — in a full impl, redirect to /login
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch job status");
      return res.json();
    },
  });
}
