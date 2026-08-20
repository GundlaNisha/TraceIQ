import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("mock_token"),
    userId: "user_mock",
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      id: "user_mock",
      fullName: "Mock User",
      primaryEmailAddress: { emailAddress: "mock@example.com" },
    },
    isSignedIn: true,
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock global fetch for unit tests
global.fetch = vi.fn().mockImplementation(async (url: string) => {

  if (url.includes("/api/v1/analysis/jobs/job_1")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: "job_1",
        status: "completed",
        progress: 100,
        requirement_title: "Idempotency Requirement",
        repository_name: "TraceIQ",
        created_at: new Date().toISOString(),
      }),
    };
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({}),
  };
}) as any;
