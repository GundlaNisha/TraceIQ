// Shape must match plan-docs/API-CONTRACT.md exactly — check field names before writing

export type Repository = {
  id: string;
  repo_url: string;
  name: string;
  sync_status: "pending" | "syncing" | "completed" | "failed";
  created_at: string;
  default_branch: string;
};

// In-memory list so mutations (add/delete) feel real during mock mode
let mockRepos: Repository[] = [
  {
    id: "repo_1",
    repo_url: "https://github.com/acme/payments-service",
    name: "payments-service",
    sync_status: "completed",
    created_at: "2026-07-20T10:00:00Z",
    default_branch: "main",
  },
  {
    id: "repo_2",
    repo_url: "https://github.com/acme/notifications",
    name: "notifications",
    sync_status: "syncing",
    created_at: "2026-08-01T09:00:00Z",
    default_branch: "main",
  },
  {
    id: "repo_3",
    repo_url: "https://github.com/acme/user-service",
    name: "user-service",
    sync_status: "failed",
    created_at: "2026-08-02T14:00:00Z",
    default_branch: "develop",
  },
];

export function getMockRepos(): Repository[] {
  return mockRepos;
}

export function getMockRepo(id: string): Repository | undefined {
  return mockRepos.find((r) => r.id === id);
}

export function addMockRepo(repo_url: string): Repository {
  const name = repo_url.split("/").pop()?.replace(".git", "") ?? "new-repo";
  const newRepo: Repository = {
    id: `repo_${Date.now()}`,
    repo_url,
    name,
    sync_status: "pending",
    created_at: new Date().toISOString(),
    default_branch: "main",
  };
  mockRepos = [newRepo, ...mockRepos];
  return newRepo;
}

export function deleteMockRepo(id: string): void {
  mockRepos = mockRepos.filter((r) => r.id !== id);
}

export function updateMockRepoStatus(
  id: string,
  status: Repository["sync_status"],
): void {
  mockRepos = mockRepos.map((r) =>
    r.id === id ? { ...r, sync_status: status } : r,
  );
}
