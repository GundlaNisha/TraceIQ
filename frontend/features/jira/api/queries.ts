"use client";

import { useApiClient } from "@/lib/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  JiraConfig,
  JiraProject,
  JiraIssueType,
  JiraStatus,
  JiraBoard,
  JiraSprint,
  JiraSearchResponse,
  JiraIssueDetail,
  JiraImportResult,
  JiraBatchImportResponse,
  JiraTestConnectionResult,
  JiraSyncResult,
} from "@/lib/types/api";

export function useJiraConfig(workspaceId?: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["jira_config", workspaceId || "default"],
    queryFn: async () => {
      const url = workspaceId
        ? `/api/v1/jira/config?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/config`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch Jira configuration");
      return res.json() as Promise<JiraConfig>;
    },
  });
}

export function useSaveJiraConfig() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      jira_domain: string;
      jira_email: string;
      jira_api_token: string;
      default_project_key?: string | null;
      workspace_id?: string | null;
    }) => {
      const url = data.workspace_id
        ? `/api/v1/jira/config?workspace_id=${encodeURIComponent(data.workspace_id)}`
        : `/api/v1/jira/config`;
      const res = await fetchApi(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jira_domain: data.jira_domain,
          jira_email: data.jira_email,
          jira_api_token: data.jira_api_token,
          default_project_key: data.default_project_key,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save Jira configuration");
      }
      return res.json() as Promise<JiraConfig>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jira_config"] });
      qc.invalidateQueries({ queryKey: ["jira_projects"] });
      qc.invalidateQueries({ queryKey: ["jira_boards"] });
      qc.invalidateQueries({ queryKey: ["jira_issue_types"] });
      qc.invalidateQueries({ queryKey: ["jira_statuses"] });
      qc.invalidateQueries({ queryKey: ["jira_issues"] });
    },
  });
}

export function useDeleteJiraConfig() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId?: string | null) => {
      const url = workspaceId
        ? `/api/v1/jira/config?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/config`;
      const res = await fetchApi(url, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete Jira configuration");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jira_config"] });
      qc.invalidateQueries({ queryKey: ["jira_projects"] });
      qc.invalidateQueries({ queryKey: ["jira_boards"] });
      qc.invalidateQueries({ queryKey: ["jira_issue_types"] });
      qc.invalidateQueries({ queryKey: ["jira_statuses"] });
      qc.invalidateQueries({ queryKey: ["jira_issues"] });
    },
  });
}

export function useTestJiraConnection() {
  const { fetchApi } = useApiClient();

  return useMutation({
    mutationFn: async (data?: {
      jira_domain?: string;
      jira_email?: string;
      jira_api_token?: string;
      workspace_id?: string | null;
    }) => {
      const url = data?.workspace_id
        ? `/api/v1/jira/test-connection?workspace_id=${encodeURIComponent(data.workspace_id)}`
        : `/api/v1/jira/test-connection`;
      const res = await fetchApi(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jira_domain: data?.jira_domain,
          jira_email: data?.jira_email,
          jira_api_token: data?.jira_api_token,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to test Jira connection");
      }
      return res.json() as Promise<JiraTestConnectionResult>;
    },
  });
}

export function useJiraProjects(workspaceId?: string | null, enabled: boolean = true) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["jira_projects", workspaceId || "default"],
    enabled,
    queryFn: async () => {
      const url = workspaceId
        ? `/api/v1/jira/projects?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/projects`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch Jira projects");
      return res.json() as Promise<JiraProject[]>;
    },
  });
}

export function useJiraIssueTypes(workspaceId?: string | null, enabled: boolean = true) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["jira_issue_types", workspaceId || "default"],
    enabled,
    queryFn: async () => {
      const url = workspaceId
        ? `/api/v1/jira/issue-types?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/issue-types`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch Jira issue types");
      return res.json() as Promise<JiraIssueType[]>;
    },
  });
}

export function useJiraStatuses(workspaceId?: string | null, enabled: boolean = true) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["jira_statuses", workspaceId || "default"],
    enabled,
    queryFn: async () => {
      const url = workspaceId
        ? `/api/v1/jira/statuses?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/statuses`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch Jira statuses");
      return res.json() as Promise<JiraStatus[]>;
    },
  });
}

export function useJiraBoards(projectKey?: string | null, workspaceId?: string | null, enabled: boolean = true) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["jira_boards", workspaceId || "default", projectKey || "all"],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectKey) params.append("project_key", projectKey);
      if (workspaceId) params.append("workspace_id", workspaceId);
      const url = `/api/v1/jira/boards?${params.toString()}`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch Jira boards");
      return res.json() as Promise<JiraBoard[]>;
    },
  });
}

export function useJiraSprints(boardId?: number | string | null, workspaceId?: string | null, enabled: boolean = true) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["jira_sprints", boardId, workspaceId || "default"],
    enabled: enabled && !!boardId,
    queryFn: async () => {
      if (!boardId) return [];
      const url = workspaceId
        ? `/api/v1/jira/boards/${boardId}/sprints?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/boards/${boardId}/sprints`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch Jira sprints");
      return res.json() as Promise<JiraSprint[]>;
    },
  });
}

export function useJiraIssues(params: {
  q?: string;
  project_key?: string;
  issue_type?: string;
  status?: string;
  status_category?: string;
  board_id?: number | string | null;
  sprint_id?: number | string | null;
  jql?: string;
  start_at?: number;
  max_results?: number;
  workspaceId?: string | null;
  enabled?: boolean;
}) {
  const { fetchApi } = useApiClient();
  const {
    q = "",
    project_key = "",
    issue_type = "",
    status = "",
    status_category = "",
    board_id = null,
    sprint_id = null,
    jql = "",
    start_at = 0,
    max_results = 50,
    workspaceId,
    enabled = true,
  } = params;

  return useQuery({
    queryKey: [
      "jira_issues",
      workspaceId || "default",
      q,
      project_key,
      issue_type,
      status,
      status_category,
      board_id,
      sprint_id,
      jql,
      start_at,
      max_results,
    ],
    enabled,
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (q) queryParams.append("q", q);
      if (project_key) queryParams.append("project_key", project_key);
      if (issue_type) queryParams.append("issue_type", issue_type);
      if (status) queryParams.append("status", status);
      if (status_category) queryParams.append("status_category", status_category);
      if (board_id) queryParams.append("board_id", String(board_id));
      if (sprint_id) queryParams.append("sprint_id", String(sprint_id));
      if (jql) queryParams.append("jql", jql);
      if (start_at) queryParams.append("start_at", String(start_at));
      if (max_results) queryParams.append("max_results", String(max_results));
      if (workspaceId) queryParams.append("workspace_id", workspaceId);

      const url = `/api/v1/jira/issues?${queryParams.toString()}`;
      const res = await fetchApi(url, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to search Jira issues");
      }
      return res.json() as Promise<JiraSearchResponse>;
    },
  });
}


export function useJiraIssueDetail(issueKey: string | null, workspaceId?: string | null) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["jira_issue_detail", issueKey, workspaceId || "default"],
    enabled: !!issueKey,
    queryFn: async () => {
      if (!issueKey) throw new Error("No issue key provided");
      const url = workspaceId
        ? `/api/v1/jira/issues/${encodeURIComponent(issueKey)}?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/issues/${encodeURIComponent(issueKey)}`;
      const res = await fetchApi(url, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to fetch Jira issue ${issueKey}`);
      }
      return res.json() as Promise<JiraIssueDetail>;
    },
  });
}

export function useImportJiraIssue() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      repository_id: string;
      issue_key: string;
      custom_title?: string;
      custom_text?: string;
      workspace_id?: string | null;
    }) => {
      const url = data.workspace_id
        ? `/api/v1/jira/import?workspace_id=${encodeURIComponent(data.workspace_id)}`
        : `/api/v1/jira/import`;
      const res = await fetchApi(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository_id: data.repository_id,
          issue_key: data.issue_key,
          custom_title: data.custom_title,
          custom_text: data.custom_text,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to import Jira issue");
      }
      return res.json() as Promise<JiraImportResult>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      qc.invalidateQueries({ queryKey: ["workspace_summary"] });
    },
  });
}

export function useBatchImportJiraIssues() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      repository_id: string;
      issue_keys: string[];
      workspace_id?: string | null;
    }) => {
      const url = data.workspace_id
        ? `/api/v1/jira/import-batch?workspace_id=${encodeURIComponent(data.workspace_id)}`
        : `/api/v1/jira/import-batch`;
      const res = await fetchApi(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository_id: data.repository_id,
          issue_keys: data.issue_keys,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to batch import Jira issues");
      }
      return res.json() as Promise<JiraBatchImportResponse>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      qc.invalidateQueries({ queryKey: ["workspace_summary"] });
    },
  });
}

export function useSyncJiraRequirement() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requirement_id: string;
      workspace_id?: string | null;
    }) => {
      const url = data.workspace_id
        ? `/api/v1/jira/requirements/${data.requirement_id}/sync?workspace_id=${encodeURIComponent(data.workspace_id)}`
        : `/api/v1/jira/requirements/${data.requirement_id}/sync`;
      const res = await fetchApi(url, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to sync requirement with Jira");
      }
      return res.json() as Promise<JiraSyncResult>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      qc.invalidateQueries({ queryKey: ["requirements", vars.requirement_id, "versions"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Phase 2: Transitions, Comment Posting, Webhook Secret
// ---------------------------------------------------------------------------

import type {
  JiraTransitionItem,
  JiraTransitionResponse,
  JiraPostCommentResponse,
  JiraWebhookSecretResponse,
  JiraWebhookTestResponse,
} from "@/lib/types/api";

export function useJiraIssueTransitions(
  issueKey: string | null | undefined,
  workspaceId?: string | null
) {
  const { fetchApi } = useApiClient();

  return useQuery({
    queryKey: ["jira_transitions", issueKey, workspaceId || "default"],
    enabled: !!issueKey,
    queryFn: async () => {
      const url = workspaceId
        ? `/api/v1/jira/issues/${encodeURIComponent(issueKey!)}/transitions?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/issues/${encodeURIComponent(issueKey!)}/transitions`;
      const res = await fetchApi(url, {});
      if (!res.ok) throw new Error("Failed to fetch issue transitions");
      return res.json() as Promise<JiraTransitionItem[]>;
    },
  });
}

export function useTransitionJiraIssue() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requirement_id: string;
      transition_id: string;
      post_comment?: boolean;
      comment?: string | null;
      workspace_id?: string | null;
    }) => {
      const url = data.workspace_id
        ? `/api/v1/jira/requirements/${data.requirement_id}/transition?workspace_id=${encodeURIComponent(data.workspace_id)}`
        : `/api/v1/jira/requirements/${data.requirement_id}/transition`;
      const res = await fetchApi(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transition_id: data.transition_id,
          post_comment: data.post_comment ?? false,
          comment: data.comment ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to transition Jira issue");
      }
      return res.json() as Promise<JiraTransitionResponse>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
      qc.invalidateQueries({ queryKey: ["jira_transitions"] });
    },
  });
}

export function usePostJiraComment() {
  const { fetchApi } = useApiClient();

  return useMutation({
    mutationFn: async (data: {
      requirement_id: string;
      comment_body?: string | null;
      workspace_id?: string | null;
    }) => {
      const url = data.workspace_id
        ? `/api/v1/jira/requirements/${data.requirement_id}/post-comment?workspace_id=${encodeURIComponent(data.workspace_id)}`
        : `/api/v1/jira/requirements/${data.requirement_id}/post-comment`;
      const res = await fetchApi(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_body: data.comment_body ?? null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to post comment to Jira");
      }
      return res.json() as Promise<JiraPostCommentResponse>;
    },
  });
}

export function useRotateWebhookSecret() {
  const { fetchApi } = useApiClient();

  return useMutation({
    mutationFn: async (workspaceId?: string | null) => {
      const url = workspaceId
        ? `/api/v1/jira/config/webhook-secret?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/config/webhook-secret`;
      const res = await fetchApi(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate webhook secret");
      }
      return res.json() as Promise<JiraWebhookSecretResponse>;
    },
  });
}

export function useTestJiraWebhook() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId?: string | null) => {
      const url = workspaceId
        ? `/api/v1/jira/webhook/test?workspace_id=${encodeURIComponent(workspaceId)}`
        : `/api/v1/jira/webhook/test`;
      const res = await fetchApi(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to test webhook simulation");
      }
      return res.json() as Promise<JiraWebhookTestResponse>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requirements"] });
    },
  });
}

