import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { RepoActionsPanel } from "../components/RepoActionsPanel";
import * as queries from "../api/queries";

vi.mock("@/lib/api/client", () => ({
  useApiClient: () => ({ fetchApi: vi.fn() }),
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const SUMMARY = {
  total: 3,
  completed: 3,
  success: 2,
  failure: 1,
  pending: 0,
  success_rate: 67,
  avg_duration_s: 160,
  by_workflow: {
    CI: { total: 3, success: 2, failure: 1, streak: 1, streak_type: "passing", last_rate: 67 },
  },
  reliability: {
    mttr_s: 3600,
    recovered_episodes: 1,
    open_failures: [],
    flaky_workflows: [{ name: "CI", recoveries: 1 }],
  },
  runs: [
    {
      id: 1,
      name: "CI",
      branch: "main",
      event: "push",
      status: "completed",
      conclusion: "success",
      bucket: "success",
      duration_s: 120,
      created_at: "2026-09-01T00:00:00Z",
      actor: "octocat",
      html_url: "https://github.com/acme/repo/actions/runs/1",
    },
  ],
};

function mockActions(data: any) {
  vi.spyOn(queries, "useRepoActions").mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as any);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RepoActionsPanel", () => {
  it("renders stat cards", () => {
    mockActions(SUMMARY);
    render(<RepoActionsPanel repositoryId="repo-1" />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("Success rate")).toBeDefined();
    expect(screen.getByText("67%")).toBeDefined();
    expect(screen.getByText("Avg duration")).toBeDefined();
    expect(screen.getByText(/2m 40s/)).toBeDefined();
  });

  it("renders recent runs", () => {
    mockActions(SUMMARY);
    render(<RepoActionsPanel repositoryId="repo-1" />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getAllByText("CI").length).toBeGreaterThan(0);
    expect(screen.getByText(/main.*push.*octocat/)).toBeDefined();
  });

  it("renders empty state when no runs", () => {
    mockActions({ ...SUMMARY, total: 0, runs: [] });
    render(<RepoActionsPanel repositoryId="repo-1" />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText(/No workflow runs yet/)).toBeDefined();
  });

  it("renders reliability section with MTTR and flaky workflows", () => {
    mockActions(SUMMARY);
    render(<RepoActionsPanel repositoryId="repo-1" />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("Reliability")).toBeDefined();
    expect(screen.getByText("1h")).toBeDefined();
    expect(screen.getAllByText("CI").length).toBeGreaterThan(0);
    expect(screen.getByText(/1× recovered/)).toBeDefined();
  });

  it("renders no-flaky empty copy", () => {
    mockActions({
      ...SUMMARY,
      reliability: {
        mttr_s: null,
        recovered_episodes: 0,
        open_failures: [],
        flaky_workflows: [],
      },
    });
    render(<RepoActionsPanel repositoryId="repo-1" />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText(/No failure→recovery episodes yet/)).toBeDefined();
  });
});
