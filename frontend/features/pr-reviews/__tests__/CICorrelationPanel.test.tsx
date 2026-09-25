import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { CICorrelationPanel } from "../components/CICorrelationPanel";
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

function mockCorrelation(correlation: any, ci: any = {}) {
  vi.spyOn(queries, "useCICorrelation").mockReturnValue({
    data: {
      ci: { state: "success", total: 2, success: 2, failure: 0, pending: 0, checks: [], ...ci },
      impacted_files: [],
      correlation,
    },
    isLoading: false,
  } as any);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("CICorrelationPanel", () => {
  it("renders clean state when CI green", () => {
    mockCorrelation({ verdict: "clean", in_blast_radius: [], unrelated: [] });
    render(<CICorrelationPanel reviewId="r1" />, { wrapper: makeWrapper() });
    expect(screen.getByText(/CI clean/)).toBeDefined();
  });

  it("renders in-scope failure with matched files", () => {
    mockCorrelation(
      {
        verdict: "in_scope",
        in_blast_radius: [
          { check_name: "pytest-auth", matched_files: ["auth/guard.py"] },
        ],
        unrelated: [],
      },
      { state: "failure" }
    );
    render(<CICorrelationPanel reviewId="r1" />, { wrapper: makeWrapper() });
    expect(screen.getByText(/do not merge yet/i)).toBeDefined();
    expect(screen.getByText(/pytest-auth/)).toBeDefined();
    expect(screen.getByText("auth/guard.py")).toBeDefined();
  });

  it("renders unrelated failure state", () => {
    mockCorrelation(
      { verdict: "unrelated", in_blast_radius: [], unrelated: ["deploy-docs"] },
      { state: "failure" }
    );
    render(<CICorrelationPanel reviewId="r1" />, { wrapper: makeWrapper() });
    expect(screen.getByText(/outside the predicted blast radius/i)).toBeDefined();
    expect(screen.getByText("deploy-docs")).toBeDefined();
  });
});
