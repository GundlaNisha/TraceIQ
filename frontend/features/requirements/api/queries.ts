import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api/config";

export function useRequirements() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["requirements"],
    queryFn: async () => {
      
      const res = await fetchApi(`/api/v1/requirements`, {
      });
      if (!res.ok) throw new Error("Failed to fetch requirements");
      return res.json();
    },
  });
}

export function useRequirementVersions(id: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["requirements", id, "versions"],
    enabled: !!id,
    queryFn: async () => {
      
      const res = await fetchApi(
        `/api/v1/requirements/${id}/versions`,
        {
 },
      );
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
      if (!res.ok) throw new Error("Failed to create requirement");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requirements"] }),
  });
}

export function useUpdateRequirement() {
  const { fetchApi } = useApiClient();

  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; title: string; text: string }) => {
      
      const res = await fetchApi(
        `/api/v1/requirements/${data.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: data.title, text: data.text }),
        },
      );
      if (!res.ok) throw new Error("Failed to update requirement");
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      qc.invalidateQueries({ queryKey: ["requirements", vars.id, "versions"] });
    },
  });
}

