export type PRDraftStatus = "generated" | "edited";

export type PRDraft = {
  id: string;
  title: string;
  description_markdown: string;
  status: PRDraftStatus;
};

// In-memory — supports editing via useUpdatePRDraft mock mutation
let mockDrafts: PRDraft[] = [
  {
    id: "draft_1",
    title: "feat(payments): add idempotency key support to charge API",
    description_markdown: `## Summary

Implements idempotency key support for the charge creation endpoint as specified in REQ-001.

## Requirement Reference

**REQ-001:** The charge creation endpoint must accept an optional \`idempotency_key\` header. If the same key is submitted twice within 24h, return the original response instead of creating a duplicate charge.

## Changes

| File | Change |
|---|---|
| \`src/services/payments/charge.py\` | Added \`idempotency_key\` param to \`create_charge()\`, added deduplication logic |
| \`src/models/charge.py\` | Added \`idempotency_key\` column (nullable String, unique index) |
| \`src/api/routes/charges.py\` | Extract \`idempotency_key\` from request header, pass to service |
| \`src/services/payments/webhooks.py\` | Minor — updated type hints for updated Charge model |

## Tests

- \`tests/services/test_charge.py\` — added tests for idempotent charge creation and TTL expiry
- \`tests/api/test_charge_api.py\` — added integration test for duplicate idempotency key

## Risk Areas

- The \`idempotency_key\` column migration requires a \`CREATE UNIQUE INDEX\` — verify it runs without locking the charges table on production (table is large).
- The 24h TTL is implemented via a \`created_at\` timestamp comparison — ensure DB timezone is UTC.

## Testing Notes

All existing charge tests pass. New tests cover the deduplication path.`,
    status: "generated",
  },
];

export function getMockDraft(id: string): PRDraft | undefined {
  return mockDrafts.find((d) => d.id === id);
}

export function updateMockDraft(
  id: string,
  description_markdown: string,
): PRDraft {
  const draft = mockDrafts.find((d) => d.id === id)!;
  const updated = {
    ...draft,
    description_markdown,
    status: "edited" as PRDraftStatus,
  };
  mockDrafts = mockDrafts.map((d) => (d.id === id ? updated : d));
  return updated;
}
