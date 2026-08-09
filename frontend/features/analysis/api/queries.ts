import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { USE_MOCK, API_BASE_URL } from "@/lib/api/config";
import { mockImpactResult } from "@/lib/mock-data/analysis";

// Fetch the full impact result once the job is complete
export function useImpactResult(analysisId: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["analysis", analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return mockImpactResult;
      }
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
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500));
        return { job_id: "job_1" }; // fixed mock job ID
      }
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
