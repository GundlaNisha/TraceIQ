export interface Repository {
  id: string;
  repo_url: string;
  name: string;
  sync_status: "pending" | "syncing" | "completed" | "failed";
  default_branch: string;
  created_at: string;
}

export interface RequirementVersion {
  id: string;
  version_number: number;
  content: string;
  created_at: string;
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
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
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
