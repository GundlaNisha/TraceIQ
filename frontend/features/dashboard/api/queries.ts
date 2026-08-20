import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";

export function useDashboardSummary() {
  const { fetchApi } = useApiClient();
  
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/dashboard/summary`);
      if (!res.ok) {
        // Fallback to empty data if the endpoint doesn't exist yet
        return {
          repositories: { total: 0, completed: 0, syncing: 0, failed: 0 },
          recentJobs: [],
          recentAnalyses: [],
          recentPRReviews: [],
        };
      }
      return res.json();
    },
  });
}
