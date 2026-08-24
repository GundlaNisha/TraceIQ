import { useApiClient } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  invited_by: string | null;
  created_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useWorkspaces() {
  const { fetchApi } = useApiClient();
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetchApi("/api/v1/workspaces", {});
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json() as Promise<Workspace[]>;
    },
  });
}

export function useWorkspace(id: string) {
  const { fetchApi } = useApiClient();
  return useQuery({
    queryKey: ["workspace", id],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/workspaces/${id}`, {});
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return res.json() as Promise<Workspace>;
    },
    enabled: !!id,
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  const { fetchApi } = useApiClient();
  return useQuery({
    queryKey: ["workspace_members", workspaceId],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/workspaces/${workspaceId}/members`, {});
      if (!res.ok) throw new Error("Failed to fetch workspace members");
      return res.json() as Promise<WorkspaceMember[]>;
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspaceInvites(workspaceId: string) {
  const { fetchApi } = useApiClient();
  return useQuery({
    queryKey: ["workspace_invites", workspaceId],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/workspaces/${workspaceId}/invites`, {});
      if (!res.ok) throw new Error("Failed to fetch workspace invites");
      return res.json() as Promise<WorkspaceInvite[]>;
    },
    enabled: !!workspaceId,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateWorkspace() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string }) => {
      const res = await fetchApi("/api/v1/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create workspace");
      }
      return res.json() as Promise<Workspace>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useInviteMember() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      email,
      role,
    }: {
      workspaceId: string;
      email: string;
      role: string;
    }) => {
      const res = await fetchApi(`/api/v1/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to send invitation");
      }
      return res.json() as Promise<WorkspaceInvite>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace_invites", vars.workspaceId] });
    },
  });
}

export function useUpdateMemberRole() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string;
      userId: string;
      role: string;
    }) => {
      const res = await fetchApi(
        `/api/v1/workspaces/${workspaceId}/members/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update member role");
      }
      return res.json() as Promise<WorkspaceMember>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace_members", vars.workspaceId] });
    },
  });
}

export function useRemoveMember() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
    }: {
      workspaceId: string;
      userId: string;
    }) => {
      const res = await fetchApi(
        `/api/v1/workspaces/${workspaceId}/members/${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to remove member");
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace_members", vars.workspaceId] });
    },
  });
}
