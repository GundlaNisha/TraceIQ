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
