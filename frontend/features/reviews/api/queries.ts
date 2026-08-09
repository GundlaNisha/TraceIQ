import { useQuery, useMutation } from "@tanstack/react-query";
import { USE_MOCK, API_BASE_URL } from "@/lib/api/config";
import { mockReview, mockDiff, mockFindings } from "@/lib/mock-data/reviews";

export function useReview(id: string) {
  return useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(200);
        return mockReview;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/reviews/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch review");
      return res.json();
    },
  });
}

export function useReviewDiff(id: string) {
  return useQuery({
    queryKey: ["reviews", id, "diff"],
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(200);
        return mockDiff;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/reviews/${id}/diff`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch diff");
      return res.json();
    },
  });
}

export function useReviewFindings(id: string) {
  return useQuery({
    queryKey: ["reviews", id, "findings"],
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(300);
        return mockFindings;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/reviews/${id}/findings`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch findings");
      return res.json();
    },
  });
}

export function useCreateReview() {
  return useMutation({
    mutationFn: async (data: {
      commit_hash: string;
      repository_id: string;
    }) => {
      if (USE_MOCK) {
        await delay(500);
        return { id: "review_1" };
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create review");
      return res.json();
    },
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
