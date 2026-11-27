import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AgentMentionMenu } from "./AgentMentionMenu";

describe("AgentMentionMenu", () => {
  it("lists repositories, requirements without duplicate Jira prefix, and GitHub PRs", () => {
    render(
      <AgentMentionMenu
        isOpen={true}
        query=""
        repositories={[
          {
            id: "repo-1",
            name: "Sri-dinesh/resume-builder-ai",
            default_branch: "main",
            sync_status: "completed",
          },
        ]}
        requirements={[
          {
            id: "req-1",
            title: "[KAN-1] Exportable ATS Audit Report",
            jira_issue_key: "KAN-1",
            jira_status: "To Do",
          },
        ]}
        pullRequests={[
          {
            id: "gh-pr-11",
            number: 11,
            title: "feat(kan-1): Add Exportable ATS Audit Report",
            state: "open",
            repository_name: "Sri-dinesh/resume-builder-ai",
          },
        ]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Repos (1)")).toBeDefined();
    expect(screen.getByText("Stories (1)")).toBeDefined();
    expect(screen.getByText("PRs (1)")).toBeDefined();
    expect(screen.getByText("Sri-dinesh/resume-builder-ai")).toBeDefined();
    expect(screen.getByText("[KAN-1] Exportable ATS Audit Report")).toBeDefined();
    expect(screen.getByText("PR #11: feat(kan-1): Add Exportable ATS Audit Report")).toBeDefined();
  });
});
