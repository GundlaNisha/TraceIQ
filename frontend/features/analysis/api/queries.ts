import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnalysisJob } from "@/lib/types/api";

export function useAnalysisJobs(repoId?: string | null, requirementId?: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["analysis", repoId || "all", requirementId || "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (repoId) params.set("repo_id", repoId);
      if (requirementId) params.set("requirement_id", requirementId);
      const qs = params.toString();
      const url = qs ? `/api/v1/analysis?${qs}` : `/api/v1/analysis`;

      const res = await fetchApi(url);
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
      const res = await fetchApi(`/api/v1/analysis/${analysisId}`, {});
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
        { method: "POST" }
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
