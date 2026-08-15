import { useApiClient } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PRReview, PRReviewCreate, PRReviewFinding } from "@/lib/types/pr-review";

export function useCreatePRReview() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: PRReviewCreate) => {
      const res = await fetchApi("/api/v1/pr-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create PR review");
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pr_reviews"] });
    },
  });
}

export function usePRReviews() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["pr_reviews"],
    queryFn: async () => {
      const res = await fetchApi("/api/v1/pr-reviews", {});
      if (!res.ok) throw new Error("Failed to fetch PR reviews");
      return res.json() as Promise<PRReview[]>;
    },
  });
}

export function usePRReview(id: string) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["pr_review", id],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/pr-reviews/${id}`, {});
      if (!res.ok) throw new Error("Failed to fetch PR review");
      return res.json() as Promise<PRReview>;
    },
    // Poll every 3s while running/queued
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "queued" || data?.status === "running") return 3000;
      return false;
    },
  });
}

export function usePRReviewFindings(id: string) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["pr_review_findings", id],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/pr-reviews/${id}/findings`, {});
      if (!res.ok) throw new Error("Failed to fetch PR review findings");
      return res.json() as Promise<PRReviewFinding[]>;
    },
    enabled: !!id,
  });
}
