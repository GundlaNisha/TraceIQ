import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api/config";

export function useReviews() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/reviews`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });
}

export function useReview(id: string) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      
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
      requirement_id?: string;
    }) => {
      
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

