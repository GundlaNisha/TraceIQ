import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { CIBadge } from "../components/CIBadge";
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

function mockChecks(state: string, overrides = {}) {
  vi.spyOn(queries, "usePRChecks").mockReturnValue({
    data: {
      state,
      total: 2,
      success: state === "success" ? 2 : 1,
      failure: state === "failure" ? 1 : 0,
      pending: state === "pending" ? 1 : 0,
      checks: [],
      ...overrides,
    },
    isLoading: false,
  } as any);
}

describe("CIBadge", () => {
  it("renders passing state with counts", () => {
    mockChecks("success");
    render(<CIBadge repositoryId="repo-1" prNumber={42} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("CI 2/2")).toBeDefined();
  });

  it("renders failing state", () => {
    mockChecks("failure");
    render(<CIBadge repositoryId="repo-1" prNumber={42} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("CI 1 failed")).toBeDefined();
  });

  it("renders running state", () => {
    mockChecks("pending");
    render(<CIBadge repositoryId="repo-1" prNumber={42} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("CI running")).toBeDefined();
  });

  it("renders neutral state when no checks", () => {
    mockChecks("unknown", { total: 0, success: 0 });
    render(<CIBadge repositoryId="repo-1" prNumber={42} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("No CI")).toBeDefined();
  });

  it("renders nothing without repositoryId", () => {
    const { container } = render(
      <CIBadge repositoryId={null} prNumber={42} />,
      { wrapper: makeWrapper() }
    );
    expect(container.innerHTML).toBe("");
  });
});
