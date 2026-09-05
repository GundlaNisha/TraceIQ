import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { JiraImportDialog } from "../components/JiraImportDialog";
import { JiraTransitionModal } from "../components/JiraTransitionModal";
import { JiraPostCommentModal } from "../components/JiraPostCommentModal";

// Mock Clerk user/auth
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("mock-jwt-token") }),
  useUser: () => ({ user: { id: "user_test", firstName: "Tester" } }),
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("JiraImportDialog", () => {
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


