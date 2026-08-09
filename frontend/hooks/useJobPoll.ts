import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";

export type JobPollData = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  requirement_id?: string;
  repository_id?: string;
  created_at: string;
};

export function useJobPoll(jobId: string | null) {
  const { fetchApi } = useApiClient();

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
      const res = await fetchApi(`/api/v1/analysis/jobs/${jobId}`);
      if (res.status === 401) {
        // Session expired — in a full impl, redirect to /login
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch job status");
      return res.json();
    },
  });
}
