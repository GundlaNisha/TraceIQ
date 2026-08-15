import { useApiClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { type GitHubPullRequest } from "@/lib/types/github";

export function usePullRequests() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["github_pull_requests"],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/github/pull-requests`, {});
      if (!res.ok) {
        throw new Error("Failed to fetch pull requests");
      }
      return res.json() as Promise<GitHubPullRequest[]>;
    },
    // Stale time of 30 seconds to prevent spamming GitHub API
    staleTime: 30000,
  });
}
