import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api/config";

// LIST
export function useRepositories(options?: { all?: boolean; workspaceId?: string | null }) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["repositories", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.all) params.set("all", "true");
      if (options?.workspaceId) params.set("workspace_id", options.workspaceId);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetchApi(`/api/v1/repositories${qs}`, {});
      if (!res.ok) throw new Error("Failed to fetch repositories");
      return res.json();
    },
    refetchInterval: (query) => {
      const repos = query.state.data;
      if (Array.isArray(repos) && repos.some((r: any) => r.sync_status === "pending" || r.sync_status === "syncing")) {
        return 2000;
      }
      return false;
    },
  });
}

// SINGLE (used for polling sync status)
export function useRepository(id: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["repositories", id],
    enabled: !!id,
    queryFn: async () => {
      
      const res = await fetchApi(`/api/v1/repositories/${id}`, {
      });
      if (!res.ok) throw new Error("Failed to fetch repository");
      return res.json();
    },
    // Polling: keep refetching while status is pending/syncing
    refetchInterval: (query) => {
      const status = query.state.data?.sync_status;
      return status === "pending" || status === "syncing" ? 2000 : false;
    },
  });
}

// ADD
export function useAddRepository() {
  const { fetchApi } = useApiClient();

  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: string | { repo_url: string; workspace_id?: string | null }) => {
      const body = typeof payload === "string" ? { repo_url: payload } : payload;
      const res = await fetchApi(`/api/v1/repositories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.detail ||
            errData?.message ||
            `Failed to add repository (${res.status})`
        );
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repositories"] });
      qc.invalidateQueries({ queryKey: ["github_available_repos"] });
      qc.invalidateQueries({ queryKey: ["workspace_summary"] });
    },
  });
}

// DELETE
export function useDeleteRepository() {
  const { fetchApi } = useApiClient();

  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      
      const res = await fetchApi(`/api/v1/repositories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete repository");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repositories"] }),
  });
}

// GITHUB STATUS
export function useGithubStatus() {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["github_status"],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/github/status`, {});
      if (!res.ok) throw new Error("Failed to fetch github status");
      return res.json() as Promise<{
        connected: boolean;
        installation_id?: number | null;
        account_name?: string | null;
        settings_url?: string;
      }>;
    },
  });
}

export interface AvailableGithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  is_imported: boolean;
}

// AVAILABLE GITHUB REPOSITORIES
export function useAvailableGithubRepos(enabled: boolean = true) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["github_available_repos"],
    enabled,
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/github/available-repositories`, {});
      if (!res.ok) throw new Error("Failed to fetch available GitHub repositories");
      return res.json() as Promise<{
        connected: boolean;
        account_name?: string;
        installation_id?: number;
        total_count: number;
        settings_url: string;
        repositories: AvailableGithubRepo[];
      }>;
    },
  });
}

// DISCONNECT GITHUB
export function useDisconnectGithub() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetchApi(`/api/v1/github/disconnect`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect GitHub");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["github_status"] });
      qc.invalidateQueries({ queryKey: ["repositories"] });
    },
  });
}

// UPDATE SETTINGS
export function useUpdateRepoSettings() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      settings,
    }: {
      id: string;
      settings: {
        auto_review_prs?: boolean;
        auto_post_comments?: boolean;
        default_requirement_id?: string | null;
        workspace_id?: string | null;
      };
    }) => {
      const res = await fetchApi(`/api/v1/repositories/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update repository settings");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["repositories"] });
      qc.invalidateQueries({ queryKey: ["repositories", variables.id] });
      qc.invalidateQueries({ queryKey: ["traceability"] });
      qc.invalidateQueries({ queryKey: ["workspace_summary"] });
    },
  });
}

// LINK GITHUB INSTALLATION MANUALLY
export function useLinkGithubInstallation() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (installationId: number) => {
      const res = await fetchApi(
        `/api/v1/github/link-installation?installation_id=${installationId}`,
        {
          method: "POST",
        }
      );
      if (!res.ok) throw new Error("Failed to link GitHub installation");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["github_status"] });
      qc.invalidateQueries({ queryKey: ["github_available_repos"] });
      qc.invalidateQueries({ queryKey: ["repositories"] });
    },
  });
}

// RESYNC / REPROCESS REPOSITORY
export function useResyncRepository() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchApi(`/api/v1/repositories/${id}/resync`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to trigger repository resync");
      return res.json();
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["repositories"] });
      qc.invalidateQueries({ queryKey: ["repositories", id] });
    },
  });
}

// CANCEL REPOSITORY SYNC
export function useCancelRepositorySync() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchApi(`/api/v1/repositories/${id}/cancel-sync`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to cancel repository sync");
      return res.json();
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["repositories"] });
      qc.invalidateQueries({ queryKey: ["repositories", id] });
    },
  });
}
