# TraceIQ — API Contract

**Owner:** Sridinesh. Update this file the same day any field name, enum value, or response shape changes on the backend branch.
**Readers:** Charan and Nisha, for building mock fixtures against the real eventual shape.

This is a living document — fill in each section as you build the corresponding phase. Placeholder shapes below are what the frontend docs currently assume; treat them as a starting draft, not a spec handed down from above. If you land on something different while implementing, update here first, then let Charan/Nisha know if it affects a shape they've already mocked.

---

## Auth

### `GET /api/v1/auth/me`
```json
{ "id": "user_1", "email": "demo@traceiq.dev", "name": "Demo User" }
```
`401` if unauthenticated.

---

## Repositories

### `GET /api/v1/repositories`
```json
[
  {
    "id": "repo_1",
    "repo_url": "https://github.com/acme/payments-service",
    "name": "payments-service",
    "sync_status": "completed",
    "created_at": "2026-07-20T10:00:00Z",
    "default_branch": "main"
  }
]
```
`sync_status` enum: `pending | syncing | completed | failed`

### `POST /api/v1/repositories`
Body: `{ "repo_url": "..." }` → returns the created repo object with `sync_status: "pending"`.

### `POST /api/v1/repositories/{id}/sync`
Returns `202`.

---

## Requirements

### `GET /api/v1/requirements`
```json
[
  {
    "id": "req_1",
    "title": "...",
    "text": "...",
    "repository_id": "repo_1",
    "version_number": 2,
    "updated_at": "..."
  }
]
```

### `GET /api/v1/requirements/{id}/versions`
```json
[
  { "version_number": 1, "text": "...", "created_at": "..." },
  { "version_number": 2, "text": "...", "created_at": "..." }
]
```

---

## Analysis

### `POST /api/v1/requirements/{id}/analyze`
Returns `202` with `{ "job_id": "job_1" }`.

### `GET /api/v1/analysis/jobs/{job_id}`
```json
{
  "id": "job_1",
  "status": "running",
  "progress": 40,
  "requirement_id": "req_1",
  "repository_id": "repo_1",
  "created_at": "..."
}
```
`status` enum: `queued | running | completed | failed`

### `GET /api/v1/analysis/{analysis_id}`
```json
{
  "id": "analysis_1",
  "job_id": "job_1",
  "impacted_files": [
    {
      "file_path": "src/services/payments/charge.py",
      "confidence": 0.91,
      "reasoning": "...",
      "related_symbols": ["create_charge"],
      "related_tests": ["tests/services/test_charge.py"]
    }
  ]
}
```

---

## Search

### `GET /api/v1/search/code?q=...&repository_id=...`
```json
[
  {
    "file_path": "src/services/payments/charge.py",
    "match_type": "semantic",
    "snippet": "...",
    "score": 0.87
  }
]
```
`match_type` enum: `semantic | symbol | exact`

`403` if `repository_id` is not owned by the requesting user.

---

## Reviews (Commit Review)

### `POST /api/v1/reviews`
Body: `{ "commit_hash": "...", "repository_id": "..." }` → `202` with `{ "id": "review_1" }`.

### `GET /api/v1/reviews/{id}/diff`
Raw unified diff string or structured per-file diff array — **finalize shape here once built**.

### `GET /api/v1/reviews/{id}/findings`
```json
[
  {
    "file_path": "...",
    "line_number": 42,
    "severity": "high",
    "message": "..."
  }
]
```
`severity` enum: `high | medium | low`

---

## PR Drafts

### `POST /api/v1/pr-drafts`
Body references a review/requirement combo → `202` with `{ "job_id": "..." }` (poll via the same job endpoint pattern as Analysis).

### `GET /api/v1/pr-drafts/{id}`
```json
{
  "id": "draft_1",
  "title": "...",
  "description_markdown": "...",
  "status": "generated"
}
```
`status` enum: `generated | edited`

### `PATCH /api/v1/pr-drafts/{id}`
Body: `{ "description_markdown": "..." }` → returns updated draft with `status: "edited"`.

---

## Notes for whoever reads this next

- Every list-returning endpoint should be assumed paginated eventually — not required for v1, but don't design frontend components that would break if a `next_cursor` field showed up later.
- All protected routes assume a `credentials: "include"` cookie-based session unless Better Auth's actual implementation ends up being bearer-token based — update this note once Phase 02 is finalized.
