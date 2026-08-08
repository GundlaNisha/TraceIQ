export type RequirementVersion = {
  version_number: number;
  title: string;
  text: string;
  created_at: string;
};

export type Requirement = {
  id: string;
  title: string;
  text: string;
  repository_id: string;
  version_number: number;
  updated_at: string;
  versions?: RequirementVersion[];
};

let mockRequirements: Requirement[] = [
  {
    id: "req_1",
    title: "Add idempotency key to charge API",
    text: "The charge creation endpoint must accept an optional idempotency_key header. If the same key is submitted twice within 24h, return the original response instead of creating a duplicate charge.",
    repository_id: "repo_1",
    version_number: 2,
    updated_at: "2026-08-03T11:00:00Z",
    versions: [
      {
        version_number: 1,
        title: "Add idempotency key to charge API",
        text: "Initial version.",
        created_at: "2026-08-01T09:00:00Z",
      },
      {
        version_number: 2,
        title: "Add idempotency key to charge API",
        text: "The charge creation endpoint must accept an optional idempotency_key header. If the same key is submitted twice within 24h, return the original response instead of creating a duplicate charge.",
        created_at: "2026-08-03T11:00:00Z",
      },
    ],
  },
  {
    id: "req_2",
    title: "Email notification on failed webhook",
    text: "When a webhook delivery fails after 3 retries, send an email notification to the account owner.",
    repository_id: "repo_1",
    version_number: 1,
    updated_at: "2026-08-02T08:00:00Z",
    versions: [
      {
        version_number: 1,
        title: "Email notification on failed webhook",
        text: "When a webhook delivery fails after 3 retries, send an email notification to the account owner.",
        created_at: "2026-08-02T08:00:00Z",
      },
    ],
  },
];

export function getMockRequirements(): Requirement[] {
  return mockRequirements;
}

export function getMockRequirementVersions(id: string): RequirementVersion[] {
  return mockRequirements.find((r) => r.id === id)?.versions ?? [];
}

export function createMockRequirement(
  title: string,
  text: string,
  repository_id: string,
): Requirement {
  const newReq: Requirement = {
    id: `req_${Date.now()}`,
    title,
    text,
    repository_id,
    version_number: 1,
    updated_at: new Date().toISOString(),
    versions: [
      { version_number: 1, title, text, created_at: new Date().toISOString() },
    ],
  };
  mockRequirements = [newReq, ...mockRequirements];
  return newReq;
}

export function updateMockRequirement(
  id: string,
  title: string,
  text: string,
): Requirement {
  const req = mockRequirements.find((r) => r.id === id)!;
  const nextVersion = req.version_number + 1;
  const updated: Requirement = {
    ...req,
    title,
    text,
    version_number: nextVersion,
    updated_at: new Date().toISOString(),
    versions: [
      ...(req.versions ?? []),
      {
        version_number: nextVersion,
        title,
        text,
        created_at: new Date().toISOString(),
      },
    ],
  };
  mockRequirements = mockRequirements.map((r) => (r.id === id ? updated : r));
  return updated;
}
