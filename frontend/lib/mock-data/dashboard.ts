export const mockDashboardSummary = {
  repositories: {
    total: 3,
    completed: 2,
    syncing: 1,
    failed: 0,
  },
  recentJobs: [
    { id: "job_1", type: "analysis", status: "completed", label: "payments-service • REQ-001", created_at: "2026-08-04T10:00:00Z" },
    { id: "job_2", type: "review",   status: "completed", label: "payments-service • a1b2c3d", created_at: "2026-08-03T14:00:00Z" },
    { id: "job_3", type: "analysis", status: "running",   label: "notifications • REQ-002",   created_at: "2026-08-04T11:00:00Z" },
    { id: "job_4", type: "pr_draft", status: "failed",    label: "payments-service • draft",  created_at: "2026-08-02T09:00:00Z" },
  ],
  recentAnalyses: [
    { id: "analysis_1", requirement_title: "Add idempotency key to charge API", repository: "payments-service", impacted_files_count: 4, created_at: "2026-08-04T10:00:00Z" },
    { id: "analysis_2", requirement_title: "Email notification on failed webhook", repository: "notifications", impacted_files_count: 2, created_at: "2026-08-03T08:00:00Z" },
  ],
  recentReviews: [
    { id: "review_1", commit_hash: "a1b2c3d", repository: "payments-service", findings_count: 3, status: "completed", created_at: "2026-08-03T14:00:00Z" },
  ],
  recentPRDrafts: [
    { id: "draft_1", title: "feat(payments): add idempotency key support", status: "generated", created_at: "2026-08-04T10:00:00Z" },
  ],
};
