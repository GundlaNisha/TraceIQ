import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api/config";
import { AnalysisJob } from "@/lib/types/api";

export function useAnalysisJobs() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["analysis"],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/analysis`);
      if (!res.ok) throw new Error("Failed to fetch analysis jobs");
      return res.json() as Promise<AnalysisJob[]>;
    },
  });
}

// Fetch the full impact result once the job is complete
export function useImpactResult(analysisId: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["analysis", analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      
      const res = await fetchApi(`/api/v1/analysis/${analysisId}`, {
      });
      if (!res.ok) throw new Error("Failed to fetch analysis result");
      return res.json();
    },
  });
}

// Trigger a new analysis for a requirement
// Real API: POST /requirements/{id}/analyze → 202 → { job_id }
export function useTriggerAnalysis() {
  const { fetchApi } = useApiClient();

  return useMutation({
    mutationFn: async (requirementId: string) => {
      
      const res = await fetchApi(
        `/api/v1/requirements/${requirementId}/analyze`,
        { method: "POST",
 },
      );
      if (res.status !== 202) throw new Error("Failed to trigger analysis");
      return res.json(); // { job_id: "..." }
    },
  });
}

export function useDeleteAnalysisJob() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetchApi(`/api/v1/analysis/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete analysis job");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis"] });
    },
  });
}
