import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api/config";
import { PRDraft } from "@/lib/types/api";

export function usePRDrafts() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["pr-drafts"],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/pr-drafts`);
      if (!res.ok) throw new Error("Failed to fetch PR drafts");
      return res.json() as Promise<PRDraft[]>;
    },
  });
}

// Fetch a draft by ID
export function usePRDraft(draftId: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["pr-drafts", draftId],
    enabled: !!draftId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "queued" || status === "generating") return 2000;
      return false;
    },
    queryFn: async () => {
      
      const res = await fetchApi(`/api/v1/pr-drafts/${draftId}`, {
      });
      if (!res.ok) throw new Error("Failed to fetch PR draft");
      return res.json();
    },
  });
}

// Trigger draft generation — 202 + poll pattern (same as analysis)
// The job_id returned here gets passed into useJobPoll
export function useCreatePRDraft() {
  const { fetchApi } = useApiClient();

  return useMutation({
    mutationFn: async (data: {
      requirement_id?: string;
      commit_event_id?: string;
    }) => {
      
      const res = await fetchApi(`/api/v1/pr-drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status !== 202)
        throw new Error("Failed to trigger PR draft generation");
      return res.json(); // { job_id: "..." } — then poll until job completes, which gives draft_id
    },
  });
}

// Update draft markdown content
export function useUpdatePRDraft() {
  const { fetchApi } = useApiClient();

  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; description_markdown: string }) => {
      
      const res = await fetchApi(`/api/v1/pr-drafts/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description_markdown: data.description_markdown,
        }),
      });
      if (!res.ok) throw new Error("Failed to save draft");
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pr-drafts", vars.id] });
    },
  });
}
