import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { USE_MOCK, API_BASE_URL } from "@/lib/api/config";
import {
  getMockRepos,
  getMockRepo,
  addMockRepo,
  deleteMockRepo,
  updateMockRepoStatus,
} from "@/lib/mock-data/repositories";

// LIST
export function useRepositories() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(300);
        return getMockRepos();
      }
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
      if (USE_MOCK) {
        await delay(200);
        return getMockRepo(id!);
      }
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
      if (USE_MOCK) {
        await delay(400);
        const newRepo = addMockRepo(repo_url);
        // Simulate the status progression: pending → syncing → completed
        setTimeout(() => {
          updateMockRepoStatus(newRepo.id, "syncing");
          qc.invalidateQueries({ queryKey: ["repositories"] });
        }, 1500);
        setTimeout(() => {
          updateMockRepoStatus(newRepo.id, "completed");
          qc.invalidateQueries({ queryKey: ["repositories"] });
        }, 5000);
        return newRepo;
      }
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
      if (USE_MOCK) {
        await delay(300);
        deleteMockRepo(id);
        return;
      }
      const res = await fetchApi(`/api/v1/repositories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete repository");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repositories"] }),
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
