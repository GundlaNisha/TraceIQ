// Shape must match plan-docs/API-CONTRACT.md exactly

export type JobStatus = "queued" | "running" | "completed" | "failed";

export type AnalysisJob = {
  id: string;
  status: JobStatus;
  progress: number; // 0–100
  requirement_id: string;
  repository_id: string;
  created_at: string;
};

export type ImpactedFile = {
  file_path: string;
  confidence: number; // 0.0–1.0
  reasoning: string;
  related_symbols: string[];
  related_tests: string[];
};

export type ImpactResult = {
  id: string;
  job_id: string;
  impacted_files: ImpactedFile[];
  dependency_graph?: {
    nodes: { id: string; label: string; impacted: boolean }[];
    edges: { source: string; target: string }[];
  };
};

// Module-level state so the mock job advances across hook calls (simulates polling)
const jobProgressState: Record<
  string,
  { progress: number; status: JobStatus }
> = {
  job_1: { progress: 0, status: "queued" },
};

export function getMockJob(jobId: string): AnalysisJob {
  const state = jobProgressState[jobId] ?? { progress: 0, status: "queued" };

  // Advance progress on each call — simulates real polling behaviour
  if (state.status === "queued") {
    state.status = "running";
    state.progress = 10;
  } else if (state.status === "running" && state.progress < 100) {
    state.progress = Math.min(state.progress + 20, 100);
    if (state.progress >= 100) state.status = "completed";
  }

  jobProgressState[jobId] = state;

  return {
    id: jobId,
    status: state.status,
    progress: state.progress,
    requirement_id: "req_1",
    repository_id: "repo_1",
    created_at: "2026-08-04T10:00:00Z",
  };
}

export function resetMockJob(jobId: string): void {
  jobProgressState[jobId] = { progress: 0, status: "queued" };
}

export const mockImpactResult: ImpactResult = {
  id: "analysis_1",
  job_id: "job_1",
  impacted_files: [
    {
      file_path: "src/services/payments/charge.py",
      confidence: 0.91,
      reasoning:
        "This file directly implements the charge-creation flow. Adding idempotency key support will require changes to the create_charge function signature and the database model.",
      related_symbols: ["create_charge", "ChargeService", "ChargeRequest"],
      related_tests: [
        "tests/services/test_charge.py",
        "tests/api/test_charge_api.py",
      ],
    },
    {
      file_path: "src/models/charge.py",
      confidence: 0.85,
      reasoning:
        "The Charge model will need a new nullable idempotency_key column with a unique index to support deduplication.",
      related_symbols: ["Charge"],
      related_tests: ["tests/models/test_charge_model.py"],
    },
    {
      file_path: "src/services/payments/webhooks.py",
      confidence: 0.62,
      reasoning:
        "Consumes charge events — if the charge schema changes, webhook handlers that read charge fields may need updates.",
      related_symbols: ["handle_charge_webhook", "ChargeWebhookHandler"],
      related_tests: [],
    },
    {
      file_path: "src/api/routes/charges.py",
      confidence: 0.55,
      reasoning:
        "The charges API route will need to extract the idempotency_key from the request header and pass it to the service layer.",
      related_symbols: ["create_charge_endpoint"],
      related_tests: ["tests/api/test_charge_api.py"],
    },
  ],
  dependency_graph: {
    nodes: [
      {
        id: "src/api/routes/charges.py",
        label: "routes/charges.py",
        impacted: true,
      },
      {
        id: "src/services/payments/charge.py",
        label: "services/charge.py",
        impacted: true,
      },
      { id: "src/models/charge.py", label: "models/charge.py", impacted: true },
      {
        id: "src/services/payments/webhooks.py",
        label: "services/webhooks.py",
        impacted: true,
      },
      {
        id: "src/services/payments/refunds.py",
        label: "services/refunds.py",
        impacted: false,
      },
      { id: "src/db/session.py", label: "db/session.py", impacted: false },
    ],
    edges: [
      {
        source: "src/api/routes/charges.py",
        target: "src/services/payments/charge.py",
      },
      {
        source: "src/services/payments/charge.py",
        target: "src/models/charge.py",
      },
      {
        source: "src/services/payments/charge.py",
        target: "src/db/session.py",
      },
      {
        source: "src/services/payments/webhooks.py",
        target: "src/models/charge.py",
      },
      {
        source: "src/services/payments/refunds.py",
        target: "src/models/charge.py",
      },
    ],
  },
};
