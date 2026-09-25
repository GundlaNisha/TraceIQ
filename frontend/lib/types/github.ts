export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface GitHubPullRequest {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  html_url: string;
  created_at: string;
  updated_at: string;
  draft: boolean;
  repository_id?: string | null;
  repository_url: string;
  repository_name: string;
  workspace_id?: string | null;
  workspace_name?: string | null;
  user: GitHubUser;
}

export type CICheckState = "success" | "failure" | "pending" | "unknown";

export interface CICheck {
  name: string;
  status: string;
  conclusion: string | null;
  bucket: "success" | "failure" | "pending";
  started_at?: string | null;
  completed_at?: string | null;
  html_url?: string | null;
}

export interface CIChecksSummary {
  state: CICheckState;
  total: number;
  success: number;
  failure: number;
  pending: number;
  checks: CICheck[];
  head_sha?: string | null;
}

export interface CICorrelationEntry {
  check_name: string;
  matched_files: string[];
}

export type ActionsBucket = "success" | "failure" | "pending";

export interface ActionsRun {
  id: number | null;
  name: string;
  branch?: string | null;
  event?: string | null;
  status: string;
  conclusion?: string | null;
  bucket: ActionsBucket;
  duration_s?: number | null;
  created_at?: string | null;
  actor?: string | null;
  html_url?: string | null;
}

export interface WorkflowStats {
  total: number;
  success: number;
  failure: number;
  streak: number;
  streak_type: "passing" | "failing" | null;
  last_rate: number | null;
}

export interface ReliabilitySummary {
  mttr_s: number | null;
  recovered_episodes: number;
  open_failures: string[];
  flaky_workflows: { name: string; recoveries: number }[];
}

export interface RepoActionsSummary {
  total: number;
  completed: number;
  success: number;
  failure: number;
  pending: number;
  success_rate: number | null;
  avg_duration_s: number | null;
  by_workflow: Record<string, WorkflowStats>;
  reliability: ReliabilitySummary;
  runs: ActionsRun[];
}

export interface CICorrelation {
  ci: CIChecksSummary;
  impacted_files: {
    file_path: string;
    confidence?: number | null;
    risk_level?: string;
  }[];
  correlation: {
    verdict: "clean" | "in_scope" | "unrelated";
    in_blast_radius: CICorrelationEntry[];
    unrelated: string[];
  };
}
