import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useJobPoll } from "@/hooks/useJobPoll";
import { resetMockJob } from "@/lib/mock-data/analysis";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useJobPoll", () => {
  beforeEach(() => resetMockJob("job_1"));

  it("starts at queued and advances to running", async () => {
    const { result } = renderHook(() => useJobPoll("job_1"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(["queued", "running"]).toContain(result.current.data?.status);
  });

  it("returns null data when jobId is null", () => {
    const { result } = renderHook(() => useJobPoll(null), {
      wrapper: makeWrapper(),
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("stops polling once status is completed", async () => {
    const { result } = renderHook(() => useJobPoll("job_1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.data?.status).toBe("completed"), {
      timeout: 15000,
      interval: 500,
    });

    expect(result.current.data?.progress).toBe(100);
  }, 15000);
});
