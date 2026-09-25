import { useApiClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import {
  type CIChecksSummary,
  type GitHubPullRequest,
  type RepoActionsSummary,
} from "@/lib/types/github";

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

export function usePRChecks(repoId?: string | null, prNumber?: number | null) {
  const { fetchApi } = useApiClient();
  const enabled = Boolean(repoId && prNumber);

  return useQuery({
    queryKey: ["github_pr_checks", repoId, prNumber],
    queryFn: async () => {
      const url = `/api/v1/github/pull-requests/checks?repo_id=${encodeURIComponent(repoId!)}&pr_number=${prNumber}`;
      const res = await fetchApi(url, {});
      if (!res.ok) {
        throw new Error("Failed to fetch PR checks");
      }
      return res.json() as Promise<CIChecksSummary>;
    },
    enabled,
    // CI state changes slowly; 60s cache avoids N+1 rate-limit pressure
    // on PR lists. Webhook check_run events land server-side; the next
    // stale refetch picks them up without manual invalidation.
    staleTime: 60000,
    retry: 1,
  });
}

export function useRepoActions(repoId?: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["github_repo_actions", repoId],
    queryFn: async () => {
      const url = `/api/v1/github/pull-requests/actions?repo_id=${encodeURIComponent(repoId!)}`;
      const res = await fetchApi(url, {});
      if (!res.ok) {
        throw new Error("Failed to fetch repo Actions");
      }
      return res.json() as Promise<RepoActionsSummary>;
    },
    enabled: Boolean(repoId),
    // Workflow history changes slowly; 2min cache protects the
    // rate-limited Actions API.
    staleTime: 120000,
    retry: 1,
  });
}
