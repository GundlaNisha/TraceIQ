import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AttachedRequirementBadge } from "../components/AttachedRequirementBadge";
import type { PRReview } from "@/lib/types/pr-review";

const baseReview: PRReview = {
  id: "rev-1",
  user_id: "user_1",
  repository_id: "repo-1",
  requirement_id: null,
  pr_number: 11,
  pr_title: "feat(kan-1): Exportable ATS Audit Report",
  pr_html_url: "https://github.com/Sri-dinesh/resume-builder-ai/pull/11",
  status: "completed",
  summary: "All checks pass",
  created_at: "2026-11-27T12:00:00Z",
};

describe("AttachedRequirementBadge", () => {
  it("shows empty indicator when no requirement is attached", () => {
    render(<AttachedRequirementBadge review={baseReview} />);
    expect(screen.getByText("No requirement attached")).toBeDefined();
  });

  it("shows linked Jira requirement title and version in badge and panel variants", () => {
    const linked: PRReview = {
      ...baseReview,
      requirement_id: "req-1",
      requirement_title: "[KAN-1] Exportable ATS Audit Report",
      requirement_jira_issue_key: "KAN-1",
      requirement_jira_issue_url: "https://example.atlassian.net/browse/KAN-1",
      requirement_jira_status: "In Progress",
      requirement_version_number: 2,
    };

    const { rerender } = render(<AttachedRequirementBadge review={linked} variant="badge" />);
    expect(screen.getByText("[KAN-1] Exportable ATS Audit Report")).toBeDefined();
    expect(screen.getByText("v2")).toBeDefined();

    rerender(<AttachedRequirementBadge review={linked} variant="panel" />);
    expect(screen.getByText("Attached Requirement:")).toBeDefined();
    expect(screen.getByText("KAN-1")).toBeDefined();
    expect(screen.getByText("In Progress")).toBeDefined();
    expect(screen.getByText("View Requirement →")).toBeDefined();
  });
});
