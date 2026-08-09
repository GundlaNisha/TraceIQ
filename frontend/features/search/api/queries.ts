import { useApiClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api/config";

export function useSearch(query: string, repositoryId: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["search", query, repositoryId],
    enabled: query.trim().length > 1 && !!repositoryId,
    queryFn: async () => {
      
      const params = new URLSearchParams({
        q: query,
        repository_id: repositoryId!,
      });
      const res = await fetchApi(`/api/v1/search/code?${params}`, {
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    staleTime: 10_000,
  });
}
