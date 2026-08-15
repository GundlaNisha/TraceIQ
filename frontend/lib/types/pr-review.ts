export interface PRReview {
  id: string;
  user_id: string;
  repository_id: string;
  requirement_id: string | null;
  pr_number: number;
  pr_title: string;
  pr_html_url: string;
  status: "queued" | "running" | "completed" | "failed";
  summary: string | null;
  created_at: string;
}

export interface PRReviewFinding {
  id: string;
  pr_review_id: string;
  file_path: string;
  line_number: number | null;
  severity: "high" | "medium" | "low";
  message: string;
  requirement_gap: string | null;
}

export interface PRReviewCreate {
  repository_id: string;
  pr_number: number;
  pr_title: string;
  pr_html_url: string;
  requirement_id?: string;
}
