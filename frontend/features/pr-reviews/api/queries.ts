import { useApiClient } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PRFileDiff, PRReview, PRReviewCreate, PRReviewFinding } from "@/lib/types/pr-review";

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
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some(
        (r) => r.status === "queued" || r.status === "running"
      );
      return hasActive ? 3000 : false;
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

export function usePRReviewFindings(id: string, isJobActive: boolean = false) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["pr_review_findings", id],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/pr-reviews/${id}/findings`, {});
      if (!res.ok) throw new Error("Failed to fetch PR review findings");
      return res.json() as Promise<PRReviewFinding[]>;
    },
    enabled: !!id,
    refetchInterval: isJobActive ? 3000 : false,
  });
}

export function usePublishPRComment() {
  const { fetchApi } = useApiClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetchApi(`/api/v1/pr-reviews/${reviewId}/post-comment`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to post PR comment to GitHub");
      }
      return res.json() as Promise<{ success: boolean; message: string }>;
    },
  });
}

export function usePRReviewDiffs(id: string, enabled: boolean = true) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["pr_review_diffs", id],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/pr-reviews/${id}/diffs`, {});
      if (!res.ok) throw new Error("Failed to fetch PR review diffs");
      return res.json() as Promise<PRFileDiff[]>;
    },
    enabled: !!id && enabled,
    staleTime: Infinity, // diffs are immutable once a review is complete
  });
}

export function useRerunPRReview() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetchApi(`/api/v1/pr-reviews/${reviewId}/rerun`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to rerun PR review");
      }
      return res.json() as Promise<{ id: string; status: string }>;
    },
    onSuccess: (_, reviewId) => {
      qc.invalidateQueries({ queryKey: ["pr_reviews"] });
      qc.invalidateQueries({ queryKey: ["pr_review", reviewId] });
      qc.invalidateQueries({ queryKey: ["pr_review_findings", reviewId] });
      qc.invalidateQueries({ queryKey: ["pr_review_diffs", reviewId] });
    },
  });
}

export function useDeletePRReview() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetchApi(`/api/v1/pr-reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete PR review");
      }
      return res.json() as Promise<{ id: string; deleted: boolean }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pr_reviews"] });
    },
  });
}


