import { useApiClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import type { TraceabilityMatrixResponse } from "@/lib/types/api";

export function useTraceabilityMatrix(repositoryId?: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["traceability", repositoryId ?? "all"],
    queryFn: async () => {
      const url = repositoryId
        ? `/api/v1/traceability?repository_id=${encodeURIComponent(repositoryId)}`
        : `/api/v1/traceability`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch traceability matrix");
      return res.json() as Promise<TraceabilityMatrixResponse>;
    },
    refetchInterval: (query) => {
      // If any items are in_progress, poll every 3 seconds
      const hasInProgress = query.state.data?.items?.some(
        (item) => item.compliance_status === "in_progress"
      );
      return hasInProgress ? 3000 : false;
    },
  });
}
