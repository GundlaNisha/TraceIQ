# TraceIQ — REST API Contract & Specification

**Version:** 2.0 (Post-Jira Sync, RBAC Workspaces, GitHub CI Checks & Correlation)  
**Base URL:** `http://localhost:8000` (Local) / `https://api.traceiq.dev` (Production)  
**Standard Headers:**
- `Authorization: Bearer <clerk_jwt>` (Required for all protected endpoints)
- `X-Workspace-Id: <workspace_uuid>` (Optional; scopes operations to active workspace, defaults to Personal)
- `Content-Type: application/json`

---

## 1. Authentication & Workspaces

### `GET /api/v1/auth/me`
Returns the authenticated user profile synced from Clerk.
```json
{
  "id": "usr_94a2b1c",
  "email": "lead@company.com",
  "name": "Sarah Connor",
  "avatar_url": "https://img.clerk.com/...",
  "created_at": "2026-07-20T10:00:00Z"
}
```

### `GET /api/v1/workspaces`
Lists Personal and collaborative Team Workspaces accessible to the user with their active role (`Owner`, `Admin`, `Member`, `Viewer`).
```json
[
  {
    "id": "ws_personal_1",
    "name": "Personal Workspace",
    "slug": "personal-sarah",
    "is_personal": true,
    "role": "Owner",
    "created_at": "2026-07-20T10:00:00Z"
  },
  {
    "id": "ws_team_infra",
    "name": "Core Infrastructure",
    "slug": "core-infra",
    "is_personal": false,
    "role": "Admin",
    "created_at": "2026-08-01T12:00:00Z"
  }
]
```

### `POST /api/v1/workspaces`
Create a new collaborative Team Workspace.
* **Body:** `{ "name": "Payment Platform" }`
* **Response:** Created workspace object with `role: "Owner"`.

### `POST /api/v1/workspaces/{id}/invites`
Generates a secure, expiring tokenized invite URL for team member onboarding (`/join/[token]`).
* **Body:** `{ "role": "Member", "expires_in_hours": 168 }`
* **Response:**
```json
{
  "token": "inv_7c8d9e0f",
  "invite_url": "https://traceiqoffi.vercel.app/join/inv_7c8d9e0f",
  "expires_at": "2026-08-08T12:00:00Z"
}
```

---

## 2. Repositories & AST Indexing

### `GET /api/v1/repositories`
Lists connected repositories. Supports `?all=true` or automatically filtered by `X-Workspace-Id`.
```json
[
  {
    "id": "repo_123",
    "name": "enterprise-api",
    "repo_url": "https://github.com/org/enterprise-api",
    "default_branch": "main",
    "sync_status": "completed",
    "ast_symbols_count": 4820,
    "workspace_id": "ws_team_infra",
    "auto_review_enabled": true,
    "created_at": "2026-08-10T09:00:00Z"
  }
]
```
`sync_status` enum: `pending | syncing | completed | failed`

### `POST /api/v1/repositories`
Connects repository and kicks off background Tree-sitter AST parsing and Gemini vector embedding.
* **Body:** `{ "repo_url": "https://github.com/org/enterprise-api", "workspace_id": "ws_team_infra" }`
* **Response:** Created repository object with `sync_status: "pending"`.

### `POST /api/v1/repositories/{id}/sync`
Manually trigger re-indexing and AST code graph construction.
* **Response:** `202 Accepted` with `{ "message": "Repository indexing scheduled." }`

### `PATCH /api/v1/repositories/{id}/settings`
Update repository configuration (e.g. enable/disable automated PR reviews, transfer between workspaces).
* **Body:** `{ "auto_review_enabled": true, "target_workspace_id": "ws_new_id" }`

---

## 3. Product Requirements & Blast Radius Analysis

### `GET /api/v1/requirements`
List requirements with linked Jira ticket keys, versions, and blast radius status.
```json
[
  {
    "id": "req_84",
    "title": "Migrate Token Decoder to RS256 with Redis Revocation",
    "text": "### Acceptance Criteria\n1. Tokens must use RS256 signatures...",
    "repository_id": "repo_123",
    "jira_key": "PROD-104",
    "version_number": 3,
    "last_analyzed_at": "2026-09-20T14:00:00Z",
    "updated_at": "2026-09-20T14:00:00Z"
  }
]
```

### `GET /api/v1/requirements/{id}/versions`
Fetch historical revisions of a requirement specification.
```json
[
  { "version_number": 1, "text": "Initial draft...", "created_at": "2026-09-18T10:00:00Z" },
  { "version_number": 2, "text": "Added Redis revocation requirement...", "created_at": "2026-09-19T11:00:00Z" }
]
```

### `POST /api/v1/requirements/{id}/analyze`
Triggers asynchronous 2-hop graph blast radius analysis job.
* **Response:** `202 Accepted` with `{ "job_id": "job_99a8b" }`

### `GET /api/v1/analysis/jobs/{job_id}`
Poll blast radius computation progress.
```json
{
  "id": "job_99a8b",
  "status": "completed",
  "progress": 100,
  "requirement_id": "req_84",
  "repository_id": "repo_123",
  "created_at": "2026-09-20T14:01:00Z"
}
```

### `GET /api/v1/analysis/{analysis_id}`
Full blast radius result with risk scoring and 2-hop call chains.
```json
{
  "id": "analysis_55c",
  "job_id": "job_99a8b",
  "risk_level": "HIGH",
  "risk_score": 88,
  "summary": "Modifying JWTDecoder impacts 4 downstream callers across 2 graph hops.",
  "impacted_files": {
    "files": [
      {
        "file_path": "backend/app/ai/jwt.py",
        "role": "seed",
        "confidence": 0.94,
        "risk_level": "high",
        "reasoning": "Seed modification in token decode logic."
      },
      {
        "file_path": "backend/app/modules/auth/guard.py",
        "role": "hop_1",
        "confidence": 0.89,
        "risk_level": "high",
        "reasoning": "Direct caller in AuthMiddleware.dispatch."
      },
      {
        "file_path": "backend/app/db/session.py",
        "role": "hop_1",
        "confidence": 0.85,
        "risk_level": "medium",
        "reasoning": "SessionStore.revoke_token handles Redis blacklist TTL."
      }
    ]
  }
}
```

---

## 4. Sub-15ms Hybrid Code Search (RRF)

### `GET /api/v1/search/code?q={query}&repo_id={repo_id}&limit=10`
Executes fused 3-signal search across dense vectors, full-text tsvectors, and AST symbols.
```json
[
  {
    "file_path": "backend/app/ai/jwt.py",
    "symbol_name": "JWTDecoder.verify_token",
    "match_type": "semantic",
    "score": 0.048,
    "snippet": "async def verify_token(token: str) -> TokenPayload: ...",
    "language": "python"
  }
]
```

---

## 5. Automated Pull Request Review Engine

### `GET /api/v1/pr-reviews`
Lists automated PR reviews for connected repositories.
```json
[
  {
    "id": "rev_771",
    "repository_id": "repo_123",
    "pr_number": 342,
    "pr_title": "feat(auth): Migrate Token Claims to v2 RS256",
    "verdict": "changes_requested",
    "summary": "PR modifies token format but fails to invoke Redis revocation store.",
    "requirement_id": "req_84",
    "created_at": "2026-09-20T14:30:00Z"
  }
]
```

### `GET /api/v1/pr-reviews/{id}/diff`
Returns structured per-file diff patches and parsed modifications.

### `GET /api/v1/pr-reviews/{id}/findings`
Line-level findings with requirement gap explanations.
```json
[
  {
    "file_path": "backend/app/ai/jwt.py",
    "line_number": 45,
    "severity": "high",
    "title": "Unaddressed Requirement Gap",
    "message": "RS256 verification added, but SessionStore.revoke_token is not called on logout.",
    "requirement_gap": "Requirement Acceptance Criteria #2: Expired/revoked tokens must be blacklisted in Redis."
  }
]
```

### `POST /api/v1/pr-reviews/{id}/rerun`
Re-runs AI code review on demand using latest commits or adjusted requirement context.

---

## 6. GitHub CI Checks, Actions & Blast-Radius Correlation (NEW)

### `GET /api/v1/github/pull-requests/checks?repo_id={repo_id}&pr_number={pr_number}`
Fetches normalized live CI check runs for a pull request's head commit.
```json
{
  "total": 3,
  "completed": 3,
  "success": 2,
  "failure": 1,
  "pending": 0,
  "overall": "failure",
  "head_sha": "a1b2c3d",
  "checks": [
    {
      "id": 892014,
      "name": "test / backend-unit-tests",
      "status": "completed",
      "conclusion": "failure",
      "bucket": "failure",
      "duration_s": 42,
      "html_url": "https://github.com/org/enterprise-api/actions/runs/12345/job/67890",
      "app": {
        "name": "GitHub Actions",
        "slug": "github-actions"
      }
    },
    {
      "id": 892015,
      "name": "lint / flake8",
      "status": "completed",
      "conclusion": "success",
      "bucket": "success",
      "duration_s": 14,
      "html_url": "https://github.com/org/enterprise-api/actions/runs/12345/job/67891",
      "app": {
        "name": "GitHub Actions",
        "slug": "github-actions"
      }
    }
  ]
}
```
`overall` enum: `success | failure | pending | unknown`

### `GET /api/v1/github/pull-requests/ci-correlation?review_id={review_id}`
Correlates failing GitHub CI checks with predicted blast-radius files from impact analysis.
```json
{
  "ci": {
    "total": 3,
    "failure": 1,
    "overall": "failure"
  },
  "impacted_files": [
    {
      "file_path": "backend/app/ai/jwt.py",
      "confidence": 0.94,
      "risk_level": "high"
    },
    {
      "file_path": "backend/app/modules/auth/guard.py",
      "confidence": 0.89,
      "risk_level": "high"
    }
  ],
  "correlation": {
    "verdict": "in_scope",
    "in_blast_radius": [
      {
        "check_name": "test / backend-unit-tests",
        "matched_files": ["backend/app/ai/jwt.py", "backend/app/modules/auth/guard.py"],
        "html_url": "https://github.com/org/enterprise-api/actions/runs/12345/job/67890"
      }
    ],
    "unrelated": []
  }
}
```
`correlation.verdict` enum:
- `clean`: All CI checks passing (green).
- `in_scope`: One or more failing checks directly overlap files/modules in TraceIQ's predicted blast radius.
- `unrelated`: CI failures are outside the predicted impact radius (e.g. global lint error, flaky infra).

### `GET /api/v1/github/pull-requests/actions?repo_id={repo_id}`
Repository-wide GitHub Actions run history, MTTR, and workflow reliability metrics.
```json
{
  "total": 20,
  "completed": 19,
  "success": 16,
  "failure": 3,
  "pending": 1,
  "success_rate": 84,
  "avg_duration_s": 128,
  "by_workflow": {
    "CI / Unit & Integration Tests": {
      "total": 12,
      "success": 10,
      "failure": 2,
      "streak": 4,
      "streak_type": "passing",
      "last_rate": 83
    }
  },
  "reliability": {
    "mttr_s": 320,
    "recovered_episodes": 2,
    "open_failures": ["Deploy / Staging"],
    "flaky_workflows": [
      {
        "name": "CI / Unit & Integration Tests",
        "recoveries": 2
      }
    ]
  },
  "runs": [
    {
      "id": 987654,
      "name": "CI / Unit & Integration Tests",
      "branch": "main",
      "event": "push",
      "status": "completed",
      "conclusion": "success",
      "bucket": "success",
      "duration_s": 115,
      "created_at": "2026-09-25T14:10:00Z",
      "actor": "sridinesh",
      "html_url": "https://github.com/org/enterprise-api/actions/runs/987654"
    }
  ]
}
```

---

## 7. Jira Bidirectional Synchronization & Webhooks

### `GET /api/v1/jira/config`
Check whether Jira Cloud is connected to the active workspace (token is masked).

### `POST /api/v1/jira/config`
Save Jira Cloud connection (`host`, `email`, `api_token`). Validates credentials against Jira REST API v3 before persisting.

### `POST /api/v1/jira/webhook/test-ping`
Test inbound webhook delivery and status transitions.
* **Body:** `{ "issue_key": "PROD-104", "target_status": "In Progress" }`
* **Response:** `{ "status": "delivered", "verified": true, "signature_algorithm": "HMAC-SHA256" }`

### `GET /api/v1/jira/transitions?issue_key={issue_key}`
Fetch valid next status transitions for a Jira ticket (e.g. *In Progress*, *In Review*, *Done*).

### `POST /api/v1/jira/transition`
Transition Jira issue status with an optional automated comment.
* **Body:**
```json
{
  "issue_key": "PROD-104",
  "transition_id": "31",
  "comment": "TraceIQ: Blast radius analysis completed (Risk: HIGH). Moving ticket to In Progress."
}
```

### `POST /api/v1/jira/comment`
Post an ADF-formatted comment summarizing blast radius or PR review findings to a Jira issue.
* **Body:** `{ "issue_key": "PROD-104", "markdown": "### Blast Radius Analysis\n4 impacted files..." }`

---

## 8. Continuous Traceability Matrix

### `GET /api/v1/traceability`
Retrieves end-to-end traceability matrix mapping product requirements &rarr; blast radius results &rarr; PR reviews &rarr; Jira tickets with an overall repository compliance health score.
```json
{
  "compliance_score": 94.2,
  "total_requirements": 18,
  "verified_requirements": 17,
  "drift_detected_count": 0,
  "records": [
    {
      "requirement_id": "req_84",
      "title": "Migrate Token Decoder to RS256",
      "jira_key": "PROD-104",
      "risk_level": "HIGH",
      "pr_number": 342,
      "pr_verdict": "changes_requested",
      "ci_status": "failure",
      "compliance_status": "verified"
    }
  ]
}
```
