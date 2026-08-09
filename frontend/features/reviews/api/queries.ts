import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { USE_MOCK, API_BASE_URL } from "@/lib/api/config";
import { mockReview, mockDiff, mockFindings } from "@/lib/mock-data/reviews";

export function useReview(id: string) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(200);
        return mockReview;
      }
      const res = await fetchApi(`/api/v1/reviews/${id}`, {
      });
      if (!res.ok) throw new Error("Failed to fetch review");
      return res.json();
    },
  });
}

export function useReviewDiff(id: string) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["reviews", id, "diff"],
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(200);
        return mockDiff;
      }
      const res = await fetchApi(`/api/v1/reviews/${id}/diff`, {
      });
      if (!res.ok) throw new Error("Failed to fetch diff");
      return res.json();
    },
  });
}

export function useReviewFindings(id: string) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["reviews", id, "findings"],
    queryFn: async () => {
      if (USE_MOCK) {
        await delay(300);
        return mockFindings;
      }
      const res = await fetchApi(`/api/v1/reviews/${id}/findings`, {
      });
      if (!res.ok) throw new Error("Failed to fetch findings");
      return res.json();
    },
  });
}

export function useCreateReview() {
  const { fetchApi } = useApiClient();

  return useMutation({
    mutationFn: async (data: {
      commit_hash: string;
      repository_id: string;
    }) => {
      if (USE_MOCK) {
        await delay(500);
        return { id: "review_1" };
      }
      const res = await fetchApi(`/api/v1/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
