import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { JiraImportDialog } from "../components/JiraImportDialog";
import { JiraTransitionModal } from "../components/JiraTransitionModal";
import { JiraPostCommentModal } from "../components/JiraPostCommentModal";

const mockIssuesState = vi.hoisted(() => ({
  data: undefined as any,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null as Error | null,
  refetch: vi.fn(),
}));

const mockRepositoriesResult = vi.hoisted(() => ({
  data: [{ id: "repo-1", name: "Sri-dinesh/resume-builder-ai" }],
}));

const mockConfigConfigured = vi.hoisted(() => ({
  data: {
    is_configured: true,
    is_active: true,
    auth_type: "oauth2",
    jira_domain: "https://example.atlassian.net",
    jira_email: "user@example.com",
    token_preview: "OAuth 2.0",
  },
  isLoading: false,
}));

const mockConfigUnconfigured = vi.hoisted(() => ({
  data: {
    is_configured: false,
    is_active: false,
    jira_domain: "",
    jira_email: "",
    token_preview: "",
  },
  isLoading: false,
}));

const mockConfigState = vi.hoisted(() => ({
  is_configured: false,
}));

const mockRequirementsResult = vi.hoisted(() => ({
  data: [] as Array<{ id: string; jira_issue_key?: string | null }>,
}));

const mockEmptyArrayResult = vi.hoisted(() => ({ data: [] }));

// Mock Clerk user/auth
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("mock-jwt-token") }),
  useUser: () => ({ user: { id: "user_test", firstName: "Tester" } }),
}));

vi.mock("@/features/repositories/api/queries", () => ({
  useRepositories: () => mockRepositoriesResult,
}));

vi.mock("@/features/requirements/api/queries", () => ({
  useRequirements: () => mockRequirementsResult,
}));

vi.mock("../api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/queries")>();
  return {
    ...actual,
    useJiraConfig: () => (mockConfigState.is_configured ? mockConfigConfigured : mockConfigUnconfigured),
    useJiraProjects: () => mockEmptyArrayResult,
    useJiraIssueTypes: () => mockEmptyArrayResult,
    useJiraStatuses: () => mockEmptyArrayResult,
    useJiraBoards: () => mockEmptyArrayResult,
    useJiraSprints: () => mockEmptyArrayResult,
    useJiraIssues: () => mockIssuesState,
  };
});

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("JiraImportDialog", () => {
  beforeEach(() => {
    mockConfigState.is_configured = false;
    mockRequirementsResult.data = [];
    mockIssuesState.data = undefined;
    mockIssuesState.isLoading = false;
    mockIssuesState.isFetching = false;
    mockIssuesState.isError = false;
    mockIssuesState.error = null;
    mockIssuesState.refetch = vi.fn();
  });

  it("renders the Jira import dialog when open", () => {
    render(
      <JiraImportDialog
        open={true}
        onOpenChange={() => {}}
      />,
      { wrapper: makeWrapper() }
    );

    expect(screen.getByText("Import from Jira")).toBeDefined();
  });

  it("auto-selects all available unimported issues by default and lets user uncheck or toggle mode", () => {
    mockConfigState.is_configured = true;
    mockRequirementsResult.data = [{ id: "req-existing", jira_issue_key: "KAN-99" }];
    mockIssuesState.data = {
      total: 3,
      start_at: 0,
      max_results: 100,
      issues: [
        {
          id: "1",
          key: "KAN-1",
          summary: "Add ATS Audit Report",
          url: "https://example.atlassian.net/browse/KAN-1",
          status: "To Do",
          status_category: "new",
          issue_type: "Story",
          issue_type_icon_url: "",
          priority: "High",
          priority_icon_url: "",
          project_key: "KAN",
          project_name: "Kanban",
          labels: [],
          description_preview: "",
        },
        {
          id: "2",
          key: "KAN-2",
          summary: "Portfolio URL validation",
          url: "https://example.atlassian.net/browse/KAN-2",
          status: "To Do",
          status_category: "new",
          issue_type: "Story",
          issue_type_icon_url: "",
          priority: "Medium",
          priority_icon_url: "",
          project_key: "KAN",
          project_name: "Kanban",
          labels: [],
          description_preview: "",
        },
        {
          id: "99",
          key: "KAN-99",
          summary: "Already imported requirement",
          url: "https://example.atlassian.net/browse/KAN-99",
          status: "Done",
          status_category: "done",
          issue_type: "Task",
          issue_type_icon_url: "",
          priority: "Low",
          priority_icon_url: "",
          project_key: "KAN",
          project_name: "Kanban",
          labels: [],
          description_preview: "",
        },
      ],
    };

    render(<JiraImportDialog open={true} onOpenChange={() => {}} />, {
      wrapper: makeWrapper(),
    });

    // Both unimported issues (KAN-1 & KAN-2) are auto-selected by default; already-imported KAN-99 is excluded by default
    expect(screen.getByText("2 of 3 issues selected")).toBeDefined();
    expect(screen.getByText("Fetch & Import Selected (2)")).toBeDefined();
    expect(screen.getByText("Imported")).toBeDefined();

    // User unchecks KAN-2
    fireEvent.click(screen.getByLabelText("Select KAN-2"));
    expect(screen.getByText("1 of 3 issues selected")).toBeDefined();
    expect(screen.getByText("Fetch & Import Selected (1)")).toBeDefined();

    // Toggle auto-select off -> 0 selected
    fireEvent.click(screen.getByText("Select all available requirements by default"));
    expect(screen.getByText("0 of 3 issues selected")).toBeDefined();
  });

  it("displays an explicit error state with Retry when fetching Jira issues fails", () => {
    mockConfigState.is_configured = true;
    mockIssuesState.isError = true;
    mockIssuesState.error = new Error("Jira API error (410): Endpoint removed");

    render(<JiraImportDialog open={true} onOpenChange={() => {}} />, {
      wrapper: makeWrapper(),
    });

    expect(screen.getByText("Failed to fetch Jira requirements")).toBeDefined();
    expect(screen.getByText("Jira API error (410): Endpoint removed")).toBeDefined();
    fireEvent.click(screen.getByText("Retry"));
    expect(mockIssuesState.refetch).toHaveBeenCalledTimes(1);
  });
});

describe("JiraTransitionModal", () => {
  it("renders transition modal with issue key and status", () => {
    render(
      <JiraTransitionModal
        open={true}
        onOpenChange={() => {}}
        requirementId="req-123"
        jiraIssueKey="PROJ-456"
        currentStatus="In Progress"
      />,
      { wrapper: makeWrapper() }
    );

    expect(screen.getByText("Transition Jira Issue")).toBeDefined();
    expect(screen.getByText("PROJ-456")).toBeDefined();
    expect(screen.getByText("In Progress")).toBeDefined();
  });
});

describe("JiraPostCommentModal", () => {
  it("renders post comment modal with auto-generate preview and issue key", () => {
    render(
      <JiraPostCommentModal
        open={true}
        onOpenChange={() => {}}
        requirementId="req-123"
        requirementTitle="Implement User Auth"
        jiraIssueKey="PROJ-456"
      />,
      { wrapper: makeWrapper() }
    );

    expect(screen.getAllByText("Post to Jira").length).toBeGreaterThan(0);
    expect(screen.getByText("PROJ-456")).toBeDefined();
    expect(screen.getByText("Auto-generate")).toBeDefined();
    expect(screen.getByText("Custom text")).toBeDefined();
  });
});
