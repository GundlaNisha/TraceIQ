export interface Repository {
  id: string;
  repo_url: string;
  name: string;
  sync_status: "pending" | "syncing" | "completed" | "failed";
  default_branch: string;
  github_installation_id?: number | null;
  is_private?: boolean;
  auto_review_prs?: boolean;
  auto_post_comments?: boolean;
  default_requirement_id?: string | null;
  workspace_id?: string | null;
  workspace_name?: string | null;
  created_at: string;
}

export interface RequirementVersion {
  id: string;
  requirement_id: string;
  version_number: number;
  title: string;
  text: string;
  created_at: string;
  updated_at?: string;
}

export interface Requirement {
  id: string;
  user_id: string;
  repository_id: string;
  title: string;
  text: string;
  version_number: number;
  workspace_id?: string | null;
  workspace_name?: string | null;
  repository_name?: string | null;
  jira_issue_key?: string | null;
  jira_issue_id?: string | null;
  jira_issue_url?: string | null;
  jira_status?: string | null;
  jira_priority?: string | null;
  jira_issue_type?: string | null;
  jira_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}


export interface AnalysisJob {
  id: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
  progress: number;
  requirement_id?: string;
  repository_id?: string;
  requirement_title?: string | null;
  repository_name?: string | null;
  workspace_id?: string | null;
  workspace_name?: string | null;
  result?: any;
  created_at: string;
}

export interface PRDraft {
  id: string;
  title: string;
  description_markdown: string;
  status: "queued" | "generated" | "edited" | "published";
  created_at: string;
}

export interface ReviewFinding {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
  file_path: string;
  line_number?: number;
}

export interface Review {
  id: string;
  title: string;
  status: "open" | "closed";
  created_at: string;
  findings?: ReviewFinding[];
}

export interface SearchResultItem {
  id: string;
  type: "file" | "function" | "class";
  name: string;
  path: string;
  file_path: string;
  match_type: "exact" | "semantic" | "fuzzy" | "symbol";
  snippet?: string;
  score?: number;
}

export interface TraceabilityFindingSummary {
  high: number;
  medium: number;
  low: number;
  total: number;
  gaps_count: number;
}

export interface TraceabilityReviewItem {
  id: string;
  pr_number: number;
  pr_title: string;
  pr_html_url: string;
  status: string;
  summary?: string | null;
  finding_counts: TraceabilityFindingSummary;
  created_at: string;
}

export interface TraceabilityAnalysisItem {
  id: string;
  status: string;
  impacted_files_count: number;
  high_risk_count: number;
  created_at: string;
}

export interface TraceabilityRow {
  requirement_id: string;
  title: string;
  version_number: number;
  text: string;
  repository_id: string;
  repository_name: string;
  created_at: string;
  compliance_status: "verified" | "gaps_flagged" | "in_progress" | "pending_verification";
  compliance_score: number;
  latest_analysis?: TraceabilityAnalysisItem | null;
  reviews: TraceabilityReviewItem[];
}

export interface TraceabilitySummary {
  total_requirements: number;
  verified_count: number;
  gaps_count: number;
  in_progress_count: number;
  pending_count: number;
  overall_coverage_pct: number;
}

export interface TraceabilityMatrixResponse {
  summary: TraceabilitySummary;
  items: TraceabilityRow[];
}

export interface JiraConfig {
  id?: string | null;
  workspace_id?: string | null;
  jira_domain: string;
  jira_email: string;
  default_project_key?: string | null;
  is_active: boolean;
  is_configured: boolean;
  token_preview: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  project_type_key: string;
  avatar_url: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  subtask: boolean;
  icon_url: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  category_key: string;
  category_name: string;
}

export interface JiraBoard {
  id: number | string;
  name: string;
  type: "kanban" | "scrum";
  project_key?: string | null;
  project_name?: string | null;
}

export interface JiraSprint {
  id: number | string;
  name: string;
  state: "active" | "future" | "closed";
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}


export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  url: string;
  status: string;
  status_category: string;
  issue_type: string;
  issue_type_icon_url: string;
  priority: string;
  priority_icon_url: string;
  project_key: string;
  project_name: string;
  assignee_name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  labels: string[];
  description_preview: string;
}

export interface JiraIssueDetail {
  id: string;
  key: string;
  summary: string;
  url: string;
  description_markdown: string;
  raw_description?: string;
  status: string;
  status_category: string;
  issue_type: string;
  issue_type_icon_url: string;
  priority: string;
  priority_icon_url: string;
  project_key: string;
  project_name: string;
  assignee_name?: string | null;
  reporter_name?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  labels: string[];
  components: string[];
}

export interface JiraSearchResponse {
  total: number;
  start_at: number;
  max_results: number;
  issues: JiraIssue[];
}

export interface JiraImportResult {
  requirement_id: string;
  title: string;
  jira_issue_key: string;
  jira_issue_url: string;
  jira_status?: string | null;
  jira_issue_type?: string | null;
  version_number: number;
}

export interface JiraBatchImportResponse {
  imported: JiraImportResult[];
  failed: Array<{ key: string; error: string }>;
  total_imported: number;
  total_requested: number;
}

export interface JiraTestConnectionResult {
  success: boolean;
  account_id?: string | null;
  display_name?: string | null;
  email_address?: string | null;
  jira_url?: string | null;
  message: string;
}

export interface JiraSyncResult {
  requirement_id: string;
  title: string;
  version_number: number;
  jira_issue_key: string;
  jira_status?: string | null;
  was_updated: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Jira Transitions, Comments, Webhook & Auto-Sync
// ---------------------------------------------------------------------------

export interface JiraTransitionItem {
  id: string;
  name: string;
  to_status: string;
  to_status_category: string;
}

export interface JiraTransitionResponse {
  success: boolean;
  issue_key: string;
  new_status?: string | null;
  message: string;
}

export interface JiraPostCommentResponse {
  success: boolean;
  issue_key: string;
  comment_id?: string | null;
  author?: string | null;
  message: string;
}

export interface JiraWebhookSecretResponse {
  webhook_url: string;
  webhook_secret: string;
  message: string;
}

export interface JiraWebhookTestResponse {
  success: boolean;
  message: string;
  issue_key: string;
  old_status?: string | null;
  new_status?: string | null;
  drift_detected: boolean;
  matched_requirements: number;
}

