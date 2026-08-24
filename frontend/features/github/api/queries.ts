import { useApiClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { type GitHubPullRequest } from "@/lib/types/github";

export function usePullRequests(repoId?: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["github_pull_requests", repoId || "all"],
    queryFn: async () => {
      const url = repoId
        ? `/api/v1/github/pull-requests?repo_id=${encodeURIComponent(repoId)}`
        : `/api/v1/github/pull-requests`;
      const res = await fetchApi(url, {});
      if (!res.ok) {
        throw new Error("Failed to fetch pull requests");
      }
      return res.json() as Promise<GitHubPullRequest[]>;
    },
    // Stale time of 30 seconds to prevent spamming GitHub API
    staleTime: 30000,
  });
}
