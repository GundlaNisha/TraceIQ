import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { USE_MOCK, API_BASE_URL } from "@/lib/api/config";
import {
  getMockRequirements,
  getMockRequirementVersions,
  createMockRequirement,
  updateMockRequirement,
} from "@/lib/mock-data/requirements";

export function useRequirements() {
  return useQuery({
    queryKey: ["requirements"],
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(300);
        return getMockRequirements();
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/requirements`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch requirements");
      return res.json();
    },
  });
}

export function useRequirementVersions(id: string | null) {
  return useQuery({
    queryKey: ["requirements", id, "versions"],
    enabled: !!id,
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(200);
        return getMockRequirementVersions(id!);
      }
      const res = await fetch(
        `${API_BASE_URL}/api/v1/requirements/${id}/versions`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
  });
}

export function useCreateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      text: string;
      repository_id: string;
    }) => {
      if (USE_MOCK) {
        await delay(400);
        return createMockRequirement(data.title, data.text, data.repository_id);
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create requirement");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requirements"] }),
  });
}

export function useUpdateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; title: string; text: string }) => {
      if (USE_MOCK) {
        await delay(400);
        return updateMockRequirement(data.id, data.title, data.text);
      }
      const res = await fetch(
        `${API_BASE_URL}/api/v1/requirements/${data.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
