import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { JiraImportDialog } from "../components/JiraImportDialog";

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
