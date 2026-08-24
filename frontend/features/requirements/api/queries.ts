import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Requirement } from "@/lib/types/api";

export function useRequirements(repoId?: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["requirements", repoId || "all"],
    queryFn: async () => {
      const url = repoId
        ? `/api/v1/requirements?repo_id=${encodeURIComponent(repoId)}`
        : `/api/v1/requirements`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch requirements");
      return res.json() as Promise<Requirement[]>;
    },
  });
}

export function useRequirementVersions(id: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["requirements", id, "versions"],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/requirements/${id}/versions`, {});
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
  });
}

export function useCreateRequirement() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      text: string;
      repository_id: string;
    }) => {
      const res = await fetchApi(`/api/v1/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create requirement");
      }
      return res.json() as Promise<Requirement>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      qc.invalidateQueries({ queryKey: ["workspace_summary"] });
    },
  });
}

export function useUpdateRequirement() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; title: string; text: string }) => {
      const res = await fetchApi(`/api/v1/requirements/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, text: data.text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update requirement");
      }
      return res.json() as Promise<Requirement>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      qc.invalidateQueries({ queryKey: ["requirements", vars.id, "versions"] });
    },
  });
}

export function useDeleteRequirement() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchApi(`/api/v1/requirements/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete requirement");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      qc.invalidateQueries({ queryKey: ["workspace_summary"] });
    },
  });
}
