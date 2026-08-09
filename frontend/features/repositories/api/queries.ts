import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api/config";

// LIST
export function useRepositories() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      
      const res = await fetchApi(`/api/v1/repositories`, {
      });
      if (!res.ok) throw new Error("Failed to fetch repositories");
      return res.json();
    },
  });
}

// SINGLE (used for polling sync status)
export function useRepository(id: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["repositories", id],
    enabled: !!id,
    queryFn: async () => {
      
      const res = await fetchApi(`/api/v1/repositories/${id}`, {
      });
      if (!res.ok) throw new Error("Failed to fetch repository");
      return res.json();
    },
    // Polling: keep refetching while status is pending/syncing
    refetchInterval: (query) => {
      const status = query.state.data?.sync_status;
      return status === "pending" || status === "syncing" ? 2000 : false;
    },
  });
}

// ADD
export function useAddRepository() {
  const { fetchApi } = useApiClient();

  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (repo_url: string) => {
      
      const res = await fetchApi(`/api/v1/repositories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url }),
      });
      if (!res.ok) throw new Error("Failed to add repository");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repositories"] }),
  });
}

// DELETE
export function useDeleteRepository() {
  const { fetchApi } = useApiClient();

  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      
      const res = await fetchApi(`/api/v1/repositories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete repository");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repositories"] }),
  });
}

