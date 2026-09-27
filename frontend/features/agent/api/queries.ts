import { useApiClient } from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AgentApproval,
  AgentMessage,
  AgentSession,
  AgentSessionDetail,
} from "../types";

export function useAgentSessions(workspaceId: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery<AgentSession[]>({
    queryKey: ["agent-sessions", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/agent/sessions?workspace_id=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch agent sessions");
      return res.json();
    },
  });
}

export function useAgentSession(sessionId: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery<AgentSessionDetail>({
    queryKey: ["agent-sessions", "detail", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/agent/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Failed to fetch agent session details");
      return res.json();
    },
  });
}

export function useCreateAgentSession() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation<
    AgentSession,
    Error,
    { workspace_id: string; repository_id?: string | null; requirement_id?: string | null; title?: string }
  >({
    mutationFn: async (payload) => {
      const cleanPayload: Record<string, any> = {
        workspace_id: payload.workspace_id,
        title: payload.title || "New Agent Session",
      };
      if (payload.repository_id) cleanPayload.repository_id = payload.repository_id;
      if (payload.requirement_id) cleanPayload.requirement_id = payload.requirement_id;

      const res = await fetchApi(`/api/v1/agent/sessions`, {
        method: "POST",
        body: JSON.stringify(cleanPayload),
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Failed to create agent session (${res.status}): ${errorText}`);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["agent-sessions", variables.workspace_id] });
    },
  });
}

export function useDeleteAgentSession() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation<{ deleted: boolean; id: string }, Error, { sessionId: string; workspaceId: string }>({
    mutationFn: async ({ sessionId }) => {
      const res = await fetchApi(`/api/v1/agent/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete agent session");
      return res.json();
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["agent-sessions", variables.workspaceId] });
      qc.removeQueries({ queryKey: ["agent-sessions", "detail", variables.sessionId] });
    },
  });
}

export function useSendAgentMessage() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation<
    {
      user_message: AgentMessage;
      agent_messages: AgentMessage[];
      pending_approval: AgentApproval | null;
      current_phase: string;
    },
    Error,
    { sessionId: string; content: string }
  >({
    mutationFn: async ({ sessionId, content }) => {
      const res = await fetchApi(`/api/v1/agent/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message to agent");
      return res.json();
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["agent-sessions", "detail", variables.sessionId] });
    },
  });
}

export function useSubmitAgentApproval() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation<
    AgentApproval,
    Error,
    { sessionId: string; approvalId: string; action: "approve" | "reject"; user_feedback?: string }
  >({
    mutationFn: async ({ sessionId, approvalId, action, user_feedback }) => {
      const res = await fetchApi(`/api/v1/agent/sessions/${sessionId}/approvals/${approvalId}`, {
        method: "POST",
        body: JSON.stringify({ action, user_feedback }),
      });
      if (!res.ok) throw new Error("Failed to submit approval decision");
      return res.json();
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["agent-sessions", "detail", variables.sessionId] });
    },
  });
}
