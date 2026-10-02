# TraceIQ — Azure Deployment Guide (Cost-Optimized for $100 Student Credit)

> **Last verified: October 1, 2026**
> **Stack covered:** Next.js 16 (App Router + React 19) frontend · FastAPI (Python 3.11) backend · **NeonDB Postgres 16 + pgvector (database — only option in this guide)** · **Upstash Redis (cache/queue — only option in this guide)** · Celery 5.4 (optional) · Clerk auth · Gemini embeddings/LLM
> **Repo files referenced:** `backend/Dockerfile` · `frontend/Dockerfile` · `frontend/next.config.ts` · `backend/.env.production.example` · `frontend/.env.production.example` · `backend/app/core/config.py` · `backend/app/workers/celery_app.py` · `backend/alembic.ini` · `docker-compose.yml`
> **Data-platform decision (locked):** PostgreSQL lives on **NeonDB only** — no Azure Database for PostgreSQL is created in this guide. Redis lives on **Upstash only** — no Azure Cache for Redis is created in this guide. Azure credit is spent only on compute (Container Apps) + frontend (SWA Free) + logs.

---

## Table of Contents

1. [What you will build (TL;DR)](#1-what-you-will-build-tldr)
2. [Cost strategy — how to survive on $100](#2-cost-strategy--how-to-survive-on-100)
3. [Prerequisites checklist](#3-prerequisites-checklist)
4. [Phase 0 — Azure safety rails (do this first)](#4-phase-0--azure-safety-rails-do-this-first)
5. [Phase 1 — Database (NeonDB Postgres + pgvector) + Redis (Upstash)](#5-phase-1--database-neondb-postgres--pgvector--redis-upstash)
6. [Phase 2 — Backend: FastAPI on Azure Container Apps (scale-to-zero)](#6-phase-2--backend-fastapi-on-azure-container-apps-scale-to-zero)
7. [Phase 3 — Frontend: Next.js 16 on Azure Static Web Apps (Free plan)](#7-phase-3--frontend-nextjs-16-on-azure-static-web-apps-free-plan)
8. [Phase 4 — Wiring everything together (env vars, CORS, Clerk, webhooks)](#8-phase-4--wiring-everything-together-env-vars-cors-clerk-webhooks)
9. [Phase 5 — Celery (OPTIONAL — default is OFF)](#9-phase-5--celery-optional--default-is-off)
10. [Phase 6 — Verify production end-to-end](#10-phase-6--verify-production-end-to-end)
11. [Phase 7 — Custom domain + free SSL](#11-phase-7--custom-domain--free-ssl)
12. [Phase 8 — Day-2 operations (logs, updates, backups, start/stop)](#12-phase-2-operations-logs-updates-backups-startstop)
13. [Phase 9 — Cost-control playbook](#13-phase-9--cost-control-playbook)
14. [Troubleshooting matrix](#14-troubleshooting-matrix)
15. [Teardown (to stop burning credit)](#15-teardown-to-stop-burning-credit)
16. [Appendix A — Full environment variable reference](#16-appendix-a--full-environment-variable-reference)
17. [Appendix B — CLI cheat sheet](#17-appendix-b--cli-cheat-sheet)
18. [Appendix C — Why NOT App Service / VM / ACR / Azure Redis / Azure Postgres](#18-appendix-c--why-not-app-service--vm--acr--azure-redis--azure-postgres)

---

## 1. What you will build (TL;DR)

The cheapest production-grade topology that actually fits a **$100 / 12-month Azure for Students** budget:

```
                    GitHub (main branch)
                    ├── frontend/  ── GitHub Actions ──▶  Azure Static Web Apps (Free, $0)
                    │                                       • global CDN, free SSL
                    │                                       • hybrid Next.js: SSR + RSC + ISR supported
                    │                                       • env: NEXT_PUBLIC_API_URL, Clerk publishable key
                    │
                    └── backend/   ── GHCR image ──▶  Azure Container Apps (Consumption, scale 0→2)
                                                            • FastAPI on port 8000, 0.5 vCPU / 1 GiB
                                                            • minReplicas: 0 (pays $0 when idle)
                                                            • free grant: 180k vCPU-s + 360k GiB-s + 2M req/mo
                                                            • liveness:  GET /api/v1/health/liveness
                                                            • readiness: GET /api/v1/health
                                                            │
                                              ┌─────────────┼──────────────┐
                                              ▼             ▼              ▼
                                   NeonDB Postgres    Upstash Redis   Gemini / Clerk / GitHub
                                   PG 16 + `vector`  (TLS rediss://,  (external SaaS,
                                   + `pg_trgm`        free tier; used   free tiers)
                                   pooled + SSL       when Celery ON;
                                   $0, no Azure       $0, no Azure
                                   credit touched)    credit touched)
```

| Component | Service + SKU | Est. cost (Oct 2026) | Notes |
|---|---|---|---|
| Frontend | **Azure Static Web Apps — Free** | **$0/mo** | 100 GB bandwidth free, free managed SSL, custom domain free. Limit: 250 MB app size, 10 free apps/subscription. |
| Backend API | **Azure Container Apps — Consumption** (0.5 vCPU, 1 GiB, min 0 / max 2) | **$0–$3/mo** at demo traffic | First 180k vCPU-s + 360k GiB-s + 2M requests/mo are free per subscription. Scale-to-zero = $0 when idle. Only Azure-credit consumer in this guide. |
| Database | **NeonDB Postgres 16 (free tier) + `pgvector`** | **$0/mo** | Pooled SSL connection, autosuspends when idle. Does not touch Azure credit. Enough for demo + AST indexes for small repos. |
| Cache / queue | **Upstash Redis (free tier, TLS `rediss://`)** | **$0/mo** | Wired as `REDIS_URL` from day one; consumed only when Celery is enabled (Phase 5). No Azure credit touched. |
| Image registry | **GitHub Container Registry (ghcr.io) — free** | **$0/mo** | Avoids ACR Basic (~$5/mo). Container Apps pulls directly from GHCR. |
| Logs | **Log Analytics (Consumption, 5 GB free/mo)** shared with Container Apps env | **$0/mo** if under free grant | Set 30-day retention, cap daily ingestion. |
| **Total** | **This guide (NeonDB + Upstash + SWA Free + ACA scale-to-zero)** | **≈ $0–$3/mo → $100 lasts 12+ months** | |

> **Decision for this guide (locked):** deploy **Frontend → SWA Free**, **Backend → Container Apps Consumption**, **Database → NeonDB only**, **Redis → Upstash only**, **Celery → off by default** (Upstash URL pre-wired so enabling it later is a flag flip). No Azure Database for PostgreSQL and no Azure Cache for Redis are created at any point. This is the only combination where $100 realistically survives the full 12-month student window.

---

## 2. Cost strategy — how to survive on $100

Azure for Students (verified Oct 2026): **$100 credit, valid 12 months, no credit card, one account per person, renewable yearly while enrolled. No auto-charge — when credit hits $0, the subscription is disabled (resources suspended, not immediately deleted).** Marketplace offers cannot be paid with the credit. Free-tier quotas (SWA Free, Container Apps free grant, 5 GB Log Analytics) do **not** consume credit until you exceed them.

Six rules that save you ~$40–60/mo versus a naive setup:

1. **Redis lives on Upstash only — never create Azure Cache for Redis.** Upstash free tier (TLS `rediss://`) is wired as `REDIS_URL` from day one. TraceIQ runs correctly without touching it while Celery is off: `backend/app/workers/celery_app.py` uses `memory://` broker when eager, and `backend/app/core/config.py:87-97` forces `is_celery_eager = True` whenever `ENVIRONMENT=production`. Setting `CELERY_ALWAYS_EAGER=true` is the supported production path (it is also what `render.yaml` uses). When you enable Celery (Phase 5), the same Upstash URL becomes the live broker — no new service, no Azure bill.
2. **Frontend goes to Static Web Apps Free, not to a container.** SWA Free = $0 with CDN + SSL. Putting Next.js in Container Apps/App Service would cost $5–15/mo for zero benefit.
3. **Backend goes to Container Apps Consumption with minReplicas 0**, not App Service B1 (always-on, ~$13–55/mo depending on OS/region display) and not a VM (B1s VM ~$7.60/mo + disk + IP + management burden). Idle backend on ACA = $0.
4. **Database lives on NeonDB only — never create Azure Database for PostgreSQL.** NeonDB free tier (Postgres 16, native `pgvector`, pooled SSL, autosuspend) costs $0 and connects over SSL with the same `DATABASE_URL` format the app expects (`backend/app/core/config.py:99-109` normalizes `postgres://` → `postgresql+asyncpg://` automatically). The historically biggest budget killer (Azure B1ms ≈ $15–17/mo all-in) never enters this architecture.
5. **Registry = ghcr.io, not ACR.** ACR Basic is ~$5/mo. GHCR is free for public images and Container Apps authenticates with a PAT or managed identity-free `username/PAT` secret.
6. **One resource group, one region, budget alert on day one.** East US is the cheapest + most student-quota-friendly region. Set a **$60 actual + $80 forecast budget alert** so you get emailed long before suspension. Delete preview/staging slots — on SWA Standard each environment bills ~$9/mo; on Free you are safe, but the habit matters.

How long does $100 last?

| Scenario | Monthly burn | $100 lifespan |
|---|---|---|
| **This guide: SWA Free + ACA scale-to-zero + NeonDB free + Upstash free + GHCR** | $0–$3 | **12+ months (entire student year)** |
| Same + Celery worker enabled (Upstash-backed, scale-to-zero, occasional heavy indexing) | ~$0–5 | ~12 months (worker idle = $0; each heavy job ≈ cents) |
| Anti-pattern (NOT in this guide): Azure Postgres B1ms always-on or App Service B1 backend | ~$15–120 | ~1–6 months — avoided by design |

---

## 3. Prerequisites checklist

- [ ] **Azure for Students** active — check at `portal.azure.com` → Subscriptions → your student sub → credit balance. Note the expiry date.
- [ ] **Azure CLI ≥ 2.62** + Container Apps + Static Web Apps extensions:
  ```bash
  az version
  az extension add --name containerapp --upgrade -y
  az extension add --name staticwebapp --upgrade -y
  az login
  az account show --output table   # confirm student subscription is default
  ```
- [ ] **GitHub repo** `TraceIQ` with `backend/` and `frontend/` (this repo). You need admin to add secrets.
- [ ] **External accounts (all free):** Clerk (publishable + secret + JWKS URL), Google AI Studio (Gemini API key for embeddings + LLM), GitHub App (App ID + private key + webhook secret — only if you want auto PR reviews; app works without it), **NeonDB** (free Postgres with `pgvector` — the only database in this guide), **Upstash** (free Redis — the only Redis in this guide).
- [ ] **Local tools (one-time):** Docker (for image build), `psql` or any SQL client (for `CREATE EXTENSION`), Node 20+, Python 3.11+ with `uv` (only needed for local migration run).
- [ ] Copy the env templates so you know every variable before you start:
  ```bash
  ls backend/.env.production.example frontend/.env.production.example
  ```

> Region choice: use **`eastus`** throughout this guide. It has the lowest list prices, the largest student-quota pool, and full support for SWA Free + ACA Consumption. If `eastus` rejects your student quota (rare, dynamic limits), retry in `centralus` or `centralindia` — but keep **everything in the same region** to avoid egress charges. (NeonDB/Upstash regions: pick the offering closest to `eastus`, e.g. US East, to minimize latency.)

| Item | Name |
|---|---|
| Resource group | `rg-traceiq-prod` |
| Log Analytics | `log-traceiq-prod` |
| Container Apps env | `cae-traceiq-prod` |
| Backend app | `ca-traceiq-backend` |
| SWA frontend | `swa-traceiq` |
| NeonDB project / database | `traceiq` / `traceiq` (Postgres 16) |
| Upstash Redis database | `traceiq-redis` (TLS, free tier) |
| GHCR image | `ghcr.io/<github-user>/traceiq-backend:latest` |

---

## 4. Phase 0 — Azure safety rails (do this first)

Do these **before** creating anything billable. ~10 minutes, saves your credit.

### 4.1 Create the resource group

```bash
export LOCATION=eastus
export RG=rg-traceiq-prod
az group create --name $RG --location $LOCATION
```

### 4.2 Create a budget alert ($60 actual, $80 forecast)

Portal: **Cost Management + Billing → Budgets → Add** (or CLI):

```bash
# Replace <your-email> — you will get mailed at 60/80/100% thresholds
az consumption budget create \
  --budget-name budget-traceiq-student \
  --resource-group $RG \
  --amount 80 \
  --time-grain Monthly \
  --category Cost \
  --start-date 2026-10-01 --end-date 2027-10-01 2>/dev/null \
|| echo "Create the budget in Portal: Cost Management > Budgets > Add (Monthly, \$80, alert at 60/80/100%)."
```

> The `az consumption budget` API surface changes frequently; if the CLI errors, **create it in the Portal — do not skip this step.**

### 4.3 Set Cost Management auto-check habit

- Pin **Cost Management → Cost analysis → View: Accumulated, Group by: Resource** to your dashboard.
- Check it after each phase below. Expected after full recommended deploy: **<$1 forecast**.

### 4.4 Register resource providers (student subs sometimes need this)

```bash
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.Web --wait
az provider register --namespace Microsoft.OperationalInsights --wait
```
(No `Microsoft.DBforPostgreSQL` registration — no Azure Postgres is created in this guide.)

---

## 5. Phase 1 — Database (NeonDB Postgres + pgvector) + Redis (Upstash)

TraceIQ requires **PostgreSQL 15+ with the `pgvector` extension** (HNSW cosine search on 384-dim Gemini embeddings), plus `pg_trgm`/full-text search. In this guide that is **NeonDB only**. Redis (broker + cache for the optional Celery path) is **Upstash only**. Neither touches your Azure credit.

### 5A. NeonDB Postgres (the only database, $0, ~10 min)

Why NeonDB: $0 within free limits, native `pgvector`, pooled SSL connections, autosuspend when idle. The backend only needs a `DATABASE_URL` — it does not care where Postgres lives (`backend/app/core/config.py:99-109` normalizes `postgres://` → `postgresql+asyncpg://` automatically).

1. Sign up at **neon.tech** (GitHub login, free tier, no card). Create project `traceiq` → region closest to `eastus` (e.g. US East / Virginia) → Postgres 16 → database `traceiq`.
2. In Neon SQL Editor, enable extensions:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   SELECT * FROM pg_extension WHERE extname IN ('vector','pg_trgm');
   ```
3. Copy the **pooled, SSL** connection string (Neon Dashboard → Connection Details → Pooled connection). It looks like:
   ```
   postgresql://<user>:<pass>@<endpoint>.neon.tech:5432/traceiq?sslmode=require
   ```
   For async SQLAlchemy the app converts it to `postgresql+asyncpg://...?ssl=require`. Keep the raw string — the app normalizes it.
4. Save it as `DATABASE_URL` (you will paste it into Container Apps secrets in Phase 2). Test locally:
   ```bash
   cd backend
   DATABASE_URL="<paste>" uv run python -c "import asyncio,asyncpg; print('py-ok')"
   ```
5. Run migrations **from your laptop** (cheapest — no Azure compute):
   ```bash
   cd backend
   export DATABASE_URL="<paste-neon-url>"
   export ENVIRONMENT=production
   uv sync --no-dev --frozen
   uv run alembic upgrade head
   ```
   Expect `... done` with no errors. Verify tables exist in Neon → Tables (you should see `code_symbols`, `code_dependencies`, workspaces, requirements, etc.).

Neon free-tier habits: keep one project/branch for prod (each extra branch adds storage), stay within the free storage + compute-hour quota shown on the Neon billing page, and take a `pg_dump` before risky migrations (see Phase 8).

### 5B. Upstash Redis (the only Redis, $0, ~5 min)

Why Upstash: free tier with TLS, no Azure resource, and `backend/app/workers/celery_app.py:54-62` already auto-configures SSL when `REDIS_URL` starts with `rediss://`. You wire it now so Celery can be enabled later (Phase 5) with a flag flip instead of a new provisioning cycle. While Celery is off (default), the app never dials it — it costs $0 either way.

1. Sign up at **upstash.com** (GitHub login, free tier, no card). Create a **Redis** database named `traceiq-redis` → region closest to `eastus` (e.g. US East) → enable **TLS**.
2. Leave **Eviction** on (e.g. `allkeys-lru`/`volatile-lru`) — Celery result metadata expires after 24h (`result_expires: 86400` in `celery_app.py`), so a bounded free-tier memory stays healthy.
3. Copy the TLS endpoint from the Upstash dashboard (Reddis URL / Python tab). It looks like:
   ```
   rediss://default:<password>@<endpoint>.upstash.io:6379
   ```
   The `rediss://` scheme (double-s) is mandatory — it is what triggers the app's SSL path. A plain `redis://` copy of the same endpoint will fail TLS handshakes.
4. Save it as `REDIS_URL` (you will paste it into Container Apps secrets in Phase 2 alongside `DATABASE_URL`).
5. Smoke-test from your laptop (optional, proves TLS + auth before you deploy):
   ```bash
   export REDIS_URL="rediss://default:<password>@<endpoint>.upstash.io:6379"
   uv run --with redis python -c "import os,redis; r=redis.from_url(os.environ['REDIS_URL']); print(r.ping())"
   # expected: True
   ```

> Do NOT create Azure Cache for Redis or Azure Database for PostgreSQL at any point in this guide — they are the two fastest ways to burn the $100 (see Appendix C).

---

## 6. Phase 2 — Backend: FastAPI on Azure Container Apps (scale-to-zero)

The repo already ships a production `backend/Dockerfile` (Python 3.11-slim, `uv sync --no-dev`, uvicorn with `${PORT}` / `${WEB_CONCURRENCY}`, healthcheck on `/api/v1/health/liveness`). You will build it once, push to **GHCR (free)**, and run it on **Container Apps Consumption with minReplicas 0**.

### 6.1 Build + push the image to GHCR (free, from your laptop)

```bash
cd TraceIQ/backend

# 1. Create a GitHub PAT (classic) with scopes: write:packages, read:packages, delete:packages
#    GitHub → Settings → Developer settings → Personal access tokens
export GH_USER=<your-github-username> GH_PAT=<paste-pat>
echo $GH_PAT | docker login ghcr.io -u $GH_USER --password-stdin

# 2. Build for linux/amd64 (Container Apps is x86_64) and push
docker build --platform linux/amd64 -t ghcr.io/$GH_USER/traceiq-backend:latest .
docker push ghcr.io/$GH_USER/traceiq-backend:latest
```

> Make the GHCR package **public** (or keep private — Phase 6.2 covers both). Public = simplest pull config. `github.com/<user>?tab=packages → traceiq-backend → Package settings → Change visibility`.

Optional but recommended — automate future builds with GitHub Actions (`.github/workflows/backend-aca.yml`):

```yaml
name: backend-build-push
on:
  push:
    branches: [main]
    paths: ["backend/**"]
jobs:
  build:
    runs-on: ubuntu-latest
    permissions: { packages: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v6
        with:
          context: ./backend
          platforms: linux/amd64
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/traceiq-backend:latest
```

### 6.2 Create Log Analytics + Container Apps environment (shared, cheap)

```bash
export RG=rg-traceiq-prod LOCATION=eastus CAE=cae-traceiq-prod LOG=log-traceiq-prod

az monitor log-analytics workspace create -g $RG --workspace-name $LOG -l $LOCATION
LOG_ID=$(az monitor log-analytics workspace show -g $RG --workspace-name $LOG --query customerId -o tsv)
LOG_KEY=$(az monitor log-analytics workspace get-shared-keys -g $RG --workspace-name $LOG --query primarySharedKey -o tsv)

az containerapp env create \
  --name $CAE --resource-group $RG --location $LOCATION \
  --logs-destination log-analytics \
  --logs-destination-config log-analytics-configuration-customer-id=$LOG_ID,log-analytics-configuration-shared-key=$LOG_KEY
```

> Keep **one** environment for backend (+ optional worker later). Each extra environment adds Log Analytics ingestion. Set retention to 30 days in Portal → Log Analytics → Usage and estimated costs → Data Retention.

### 6.3 Create the backend Container App (scale-to-zero, cost-tuned)

Key tuning for $100 (do not skip):

- `--min-replicas 0` — scale to zero; idle = $0.
- `--max-replicas 2` — caps burst spend.
- `--cpu 0.5 --memory 1.0Gi` — enough for FastAPI + Tree-sitter + Gemini calls; `WEB_CONCURRENCY=1` keeps RAM under 1 GiB.
- `--target-port 8000` with **external ingress** (needed for Jira/GitHub webhooks + frontend calls).
- Probes: liveness `/api/v1/health/liveness`, readiness `/api/v1/health` (both exist in `backend/app/modules/health/routes/health.py` + `backend/app/main.py`).

```bash
export RG=rg-traceiq-prod CAE=cae-traceiq-prod APP=ca-traceiq-backend
export GH_USER=<your-github-username>
export IMAGE=ghcr.io/$GH_USER/traceiq-backend:latest

# If GHCR package is PRIVATE, create a pull secret first (skip if public):
# az containerapp secret set ... (see note below)

az containerapp create \
  --name $APP --resource-group $RG --environment $CAE \
  --image $IMAGE \
  --target-port 8000 --ingress external \
  --min-replicas 0 --max-replicas 2 \
  --cpu 0.5 --memory 1.0Gi \
  --env-vars \
    ENVIRONMENT=production \
    PORT=8000 \
    WEB_CONCURRENCY=1 \
    USE_CELERY=false \
    CELERY_ALWAYS_EAGER=true \
    EMBEDDING_MODEL=gemini/gemini-embedding-2 \
    EMBEDDING_DIMENSIONS=384 \
    SNAPSHOT_DIR=data/snapshots
```

Private GHCR note — add registry auth at create/update time:

```bash
az containerapp secret set --name $APP -g $RG \
  --secrets ghcr-pat='<GH_PAT>'  # then:
az containerapp update --name $APP -g $RG \
  --registry-server ghcr.io --registry-username $GH_USER --registry-password '<GH_PAT>'
```

### 6.4 Add secrets (never as plain `--env-vars`)

All secret values go through Container Apps **secrets** and are referenced as `secretref:`. Set them now (paste real values; see Appendix A for what each does):

```bash
export APP=ca-traceiq-backend RG=rg-traceiq-prod

az containerapp secret set --name $APP -g $RG --secrets \
  database-url="<DATABASE_URL from Phase 1, NeonDB>" \
  redis-url="<REDIS_URL from Phase 1, Upstash rediss://>" \
  gemini-key="<GEMINI_API_KEY>" \
  clerk-secret="<CLERK_SECRET_KEY>" \
  clerk-pub="<CLERK_PUBLISHABLE_KEY>" \
  clerk-jwks="<CLERK_JWKS_URL>" \
  github-key="<GITHUB_PRIVATE_KEY_BASE64_OR_ESCAPED>" \
  1>/dev/null

az containerapp update --name $APP -g $RG --set-env-vars \
  DATABASE_URL=secretref:database-url \
  REDIS_URL=secretref:redis-url \
  GEMINI_API_KEY=secretref:gemini-key \
  GOOGLE_API_KEY=secretref:gemini-key \
  CLERK_SECRET_KEY=secretref:clerk-secret \
  CLERK_PUBLISHABLE_KEY=secretref:clerk-pub \
  CLERK_JWKS_URL=secretref:clerk-jwks \
  GITHUB_APP_ID="<123456>" \
  GITHUB_PRIVATE_KEY=secretref:github-key \
  GITHUB_WEBHOOK_SECRET=secretref:github-key \
  FRONTEND_URL="https://<your-swa>.azurestaticapps.net" \
  ALLOWED_ORIGINS="https://<your-swa>.azurestaticapps.net" \
  LLM_MODEL="gemini/gemini-2.5-flash" \
  GEMINI_MODEL="gemini/gemini-2.5-flash" \
  AI_STRATEGY="round_robin" \
  AI_PROVIDER_ORDER="gemini"
```

Notes:

- `GITHUB_PRIVATE_KEY`: the repo example shows `\n`-escaped PEM in one line. Preserve that: single line with literal `\n`. If the app fails to parse it, base64-encode and check `backend/app` GitHub client expectations, then adjust.
- `REDIS_URL` is your **Upstash `rediss://` URL** (Phase 1, §5B). While Celery is off (default eager mode), the app never dials it (`celery_app.py` uses `memory://` broker when eager) — but wiring the real Upstash URL now means enabling Celery later is just a flag flip (`USE_CELERY=true` + `CELERY_ALWAYS_EAGER=false`) with no secret changes.
- `FRONTEND_URL` / `ALLOWED_ORIGINS`: use a placeholder SWA URL now; you will update them to the real `*.azurestaticapps.net` URL in Phase 4 (one `az containerapp update` re-run).
- Minimal LLM spend: `AI_PROVIDER_ORDER=gemini` + free AI Studio key keeps inference at $0. Only add OpenCode/Groq keys if you need failover.

### 6.5 Verify backend is live

```bash
FQDN=$(az containerapp show --name $APP -g $RG --query properties.configuration.ingress.fqdn -o tsv)
echo "Backend: https://$FQDN"
curl -s https://$FQDN/api/v1/health/liveness; echo
curl -s https://$FQDN/api/v1/health | head -c 600; echo
```

Expected: `{"status":"alive"}` and a `{"status":"healthy",...,"services":{"database":"healthy",...}}`. If `database` is unhealthy → your NeonDB `DATABASE_URL` is wrong (check pooled host + `?sslmode=require`, and that `CREATE EXTENSION vector;` ran in the `traceiq` database, not `postgres` — see Troubleshooting #1).

> Cold starts: with minReplicas 0 the first request after idle takes ~5–15 s (image pull + uvicorn boot). This is normal and is the price of $0 idle. Keep it — do not set minReplicas 1 “to fix slowness” unless you accept ~$5–9/mo idle.

---

## 7. Phase 3 — Frontend: Next.js 16 on Azure Static Web Apps (Free plan)

SWA Free natively builds **hybrid Next.js** (App Router, React Server Components, SSR, ISR) via Oryx — no Dockerfile needed, no container cost. The repo’s `frontend/Dockerfile` (standalone output) is **not used** in this path; SWA builds from source on every push to `main`.

### 7.1 Create the Static Web App (Free) + connect GitHub

Portal path (most reliable for students):

1. Portal → **Create a resource → Static Web Apps → Create**.
2. Basics: subscription = student sub, resource group = `rg-traceiq-prod`, name = `swa-traceiq`, plan = **Free**, region = **East US 2** (SWA’s closest managed region to East US — this is normal; data regions differ from compute regions).
3. Deployment: **GitHub** → sign in → org/repo = your `TraceIQ` → branch = `main`.
4. Build details (critical — match this repo layout):
   - Build preset: **Next.js**
   - App location: **`/frontend`**
   - API location: **leave empty** (backend is a separate Container App, not an SWA managed function)
   - Output location: **`.next`** (leave default for hybrid; do NOT set `out/` — that is only for static export)
   - Custom build command: default (`npm ci && npm run build`). Ensure `frontend/package.json` build script stays `next build`.
5. Review + Create. Azure adds `.github/workflows/azure-static-web-apps-*.yml` to your repo on first deploy.

CLI alternative:

```bash
az staticwebapp create \
  --name swa-traceiq --resource-group rg-traceiq-prod \
  --sku Free --location eastus2 \
  --source https://github.com/<user>/TraceIQ --branch main \
  --app-location "/frontend" --output-location ".next" --login-with-github
```

### 7.2 Set frontend environment variables (build-time + runtime — both!)

Next.js inlines `NEXT_PUBLIC_*` **at build time**. Setting them only in the Portal after a build does nothing until the next build. You must set them in **both** places:

**A. GitHub repo secrets (for the Oryx build):** repo → Settings → Secrets → Actions → add:

| Secret | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<backend-fqdn-from-6.5>` (no trailing slash) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` (or `pk_test_...` for staging) |
| `CLERK_SECRET_KEY` | `sk_live_...` (server-side, used by `middleware.ts` + server components) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |

Then expose them to the SWA workflow. Open the auto-generated `.github/workflows/azure-static-web-apps-*.yml` and add under the `Build And Deploy` step:

```yaml
env:
  NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
  CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: /sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: /sign-up
```

**B. SWA Configuration (for SSR runtime):** Portal → Static Web App → **Configuration → Application settings → Add** the same five keys with the same values, then **Save** (triggers a restart, not a rebuild).

> Clerk + SWA gotcha: `frontend/middleware.ts` runs on the edge via `clerkMiddleware()`. It needs `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` at **both** build and runtime, and your Clerk Dashboard → Paths + Allowed Origins must list `https://<your-swa>.azurestaticapps.net`. Miss any of the three and auth silently redirects to localhost.

### 7.3 Deploy + verify

```bash
git add .github/workflows/azure-static-web-apps-*.yml
git commit -m "chore: configure SWA frontend env passthrough"
git push origin main
# Actions tab → "Azure Static Web Apps CI/CD" → green → visit URL:
az staticwebapp show --name swa-traceiq -g rg-traceiq-prod --query defaultHostname -o tsv
```

Expected: landing page loads, sign-in works via Clerk, dashboard calls succeed (open DevTools → Network → `https://<backend>/api/v1/...` returns 200, not CORS errors — if CORS, see Phase 4.1).

SWA Free limits to respect: **250 MB app size** (the repo’s standalone guidance in `frontend/Dockerfile` + `next.config.ts` `output: standalone` exists for container path; for SWA, Oryx handles tracing — if a build fails with size errors, add `output: "standalone"` + the `cp -r .next/static .next/standalone/.next/` build step per Microsoft’s hybrid-Next.js doc, then retry).

---

## 8. Phase 4 — Wiring everything together (env vars, CORS, Clerk, webhooks)

### 8.1 CORS + frontend URL (backend side, one command)

```bash
export APP=ca-traceiq-backend RG=rg-traceiq-prod
export SWA_HOST=$(az staticwebapp show --name swa-traceiq -g $RG --query defaultHostname -o tsv)
export BACKEND_FQDN=$(az containerapp show --name $APP -g $RG --query properties.configuration.ingress.fqdn -o tsv)
echo "SWA: https://$SWA_HOST  Backend: https://$BACKEND_FQDN"

az containerapp update --name $APP -g $RG --set-env-vars \
  FRONTEND_URL="https://$SWA_HOST" \
  ALLOWED_ORIGINS="https://$SWA_HOST"
```

`backend/app/core/config.py:111-127` accepts comma-separated or JSON-array `ALLOWED_ORIGINS` — the single-URL form above is correct. Redeploy takes ~1–2 min (new revision). Re-test a browser call to the backend; the `access-control-allow-origin` header must echo your SWA host.

### 8.2 Clerk (both sides)

- Clerk Dashboard → **Configure → Paths**: sign-in `/sign-in`, sign-up `/sign-up` (matches `frontend/.env.production.example` + `middleware.ts` matcher).
- Clerk Dashboard → **Allowed origins / satellite domains**: add `https://<swa-host>` and `https://<backend-fqdn>` (backend verifies JWTs against `CLERK_JWKS_URL` — the JWKS URL never changes per Clerk instance, so no update needed on redeploy).
- Backend secret check: `CLERK_SECRET_KEY` must be the **same Clerk instance** as the frontend publishable key (`pk_test` ↔ `sk_test`, `pk_live` ↔ `sk_live` — mixing test/live is the #1 auth failure).

### 8.3 GitHub App webhooks (only if using auto PR reviews)

1. GitHub App settings → Webhook URL: `https://<backend-fqdn>/api/v1/github/webhook` (confirm exact route prefix in `backend/app` GitHub routes — if your version mounts under `/api/v1/github/...`, adjust; health lives at `/api/v1/health`, GitHub routes alongside it).
2. Events: Pull request + Push (the review engine handles `pull_request.opened` / `synchronize` per README).
3. Content type `application/json`, secret = your `GITHUB_WEBHOOK_SECRET`. Because Container Apps ingress is public HTTPS with a managed cert, no ngrok is needed (unlike local dev in README §3).

### 8.4 Jira Cloud webhooks

1. TraceIQ UI → Jira config modal → save domain/email/token → copy the generated webhook secret.
2. Jira → Settings → System → WebHooks → Create: URL `https://<backend-fqdn>/api/v1/jira/webhook`, secret = pasted value, events = Issue updated + deleted.
3. UI → **Send Test Ping** (`POST /api/v1/jira/webhook/test`) to verify HMAC-SHA256 verification end-to-end.

---

## 9. Phase 5 — Celery (OPTIONAL — default is OFF)

**Recommendation: leave Celery OFF.** You lose nothing at demo/small-team scale, and you avoid a second container. Your Redis (Upstash) is already wired from Phase 1 (§5B), so nothing new needs provisioning either way.

Why OFF is correct here:

- `backend/app/core/config.py:87-97` — `is_celery_eager` returns `True` whenever `ENVIRONMENT=production`, **regardless** of `USE_CELERY`/`CELERY_ALWAYS_EAGER`. Production background jobs (repo sync, AST indexing, impact analysis, PR review) execute **in-process** via `backend/app/workers/runner.py`, which safely schedules on the running event loop and returns `202 Accepted` immediately.
- `render.yaml` (the repo’s own hosted backend) ships `USE_CELERY=false` + `CELERY_ALWAYS_EAGER=true` — the maintainers’ blessed serverless setting.
- Enabling real Celery adds a second container for workloads that complete in-process in seconds-to-minutes. The broker is already-paid-for ($0 Upstash), so the only extra cost is worker compute.

### When to turn it ON

- Indexing repos >~500 MB / >100k files where in-process Tree-sitter parsing blocks request threads.
- Sustained PR-review bursts (multiple large PRs concurrently) with 10–15 min task timeouts (`celery_task_soft_time_limit=600`, `hard=900`).
- You observe Container Apps request timeouts (default 30 s ingress) on `/repositories` POST or `/analyze` endpoints.

### How to turn it ON (Upstash-backed, ~$0–5/mo extra)

> Trap: setting `USE_CELERY=true` alone does nothing in `ENVIRONMENT=production` (forced eager). The supported options are: (a) run the worker with `ENVIRONMENT=staging`, or (b) patch `is_celery_eager` to honor `CELERY_ALWAYS_EAGER=false` in production. Option (a) requires no code change and is documented here.

1. **Reuse the Upstash Redis from Phase 1 (§5B) — create nothing new.** The `REDIS_URL` secret (`rediss://...`) already exists on the backend app; copy the same value to the worker. (`celery_app.py:54-62` auto-enables SSL for `rediss://`.)
2. **Deploy worker as a second Container App (same env, no ingress, scale-to-zero on queue length):**
   ```bash
   az containerapp create \
     --name ca-traceiq-worker --resource-group $RG --environment $CAE \
     --image $IMAGE \
     --no-ingress \
     --min-replicas 0 --max-replicas 1 \
     --cpu 0.5 --memory 1.0Gi \
     --command "uv" --args "run celery -A app.workers.celery_app.celery worker --loglevel=info --concurrency=1" \
     --env-vars ENVIRONMENT=staging USE_CELERY=true CELERY_ALWAYS_EAGER=false \
     --secrets database-url="<same-NeonDB-DATABASE_URL>" redis-url="<same-Upstash-rediss-URL>" gemini-key="<key>" \
     --set-env-vars DATABASE_URL=secretref:database-url REDIS_URL=secretref:redis-url GEMINI_API_KEY=secretref:gemini-key
   ```
   `--concurrency=1` keeps the worker inside 1 GiB (Tree-sitter + embeddings are memory-spiky; concurrency 2 needs 2 GiB).
3. **Point the API at the queue:** update backend app env: `ENVIRONMENT=staging USE_CELERY=true CELERY_ALWAYS_EAGER=false` (keep the existing `REDIS_URL=secretref:redis-url` — no secret change needed). Accept the trade-off: `staging` also relaxes any production-only guards — review `config.py`/`main.py` for environment branches before doing this.
4. **Alternative with zero code-risk:** keep API on `production`/eager and run the worker only for scheduled heavy re-indexes via `az containerapp job` (one-off executions, billed per-second, scale to zero between runs).

Cost of ON: worker at 0 replicas idle = $0; per heavy indexing job ≈ cents (0.5 vCPU × minutes). Upstash free = $0 within limits. Only turn minReplicas to 1 if queue latency matters (adds ~$5–9/mo idle — usually not worth it on student credit).

---

## 10. Phase 6 — Verify production end-to-end

Run in order; stop at the first failure and consult the Troubleshooting matrix.

```bash
export APP=ca-traceiq-backend RG=rg-traceiq-prod
export BACKEND=https://$(az containerapp show -n $APP -g $RG --query properties.configuration.ingress.fqdn -o tsv)
export SWA=https://$(az staticwebapp show --name swa-traceiq -g $RG --query defaultHostname -o tsv)

# 1. Liveness + readiness (no auth)
curl -sf $BACKEND/api/v1/health/liveness && echo " [liveness OK]"
curl -s $BACKEND/api/v1/health | python3 -m json.tool   # database must be "healthy"

# 2. OpenAPI surface is up
curl -s -o /dev/null -w "%{http_code}\n" $BACKEND/docs   # 200

# 3. Frontend serves + points at backend (view-source check)
curl -s $SWA | head -c 300; echo
# In browser: open $SWA → sign in (Clerk) → Dashboard loads (no CORS errors in console)

# 4. Authenticated smoke (paste a Clerk JWT from DevTools → Application → Cookies/Storage)
export JWT=<paste-clerk-jwt> WS=<workspace-id-from-UI>
curl -s $BACKEND/api/v1/workspaces -H "Authorization: Bearer $JWT" | head -c 400; echo

# 5. AI path (exercises Gemini key + pgvector)
curl -s "$BACKEND/api/v1/search/code?q=auth%20guard" -H "Authorization: Bearer $JWT" -H "X-Workspace-Id: $WS" | head -c 400; echo

# 6. Webhooks reachable from the public internet (Jira/GitHub require this)
curl -s -o /dev/null -w "jira webhook route: %{http_code}\n" -X POST $BACKEND/api/v1/jira/webhook/test -H "Authorization: Bearer $JWT" -H "X-Workspace-Id: $WS"
```

Functional checklist in the UI: connect a small repo → AST indexing job completes → create requirement → **Analyze Blast Radius** returns 2-hop graph → import a Jira issue (ADF renders as Markdown) → transition its status → open a test PR on GitHub → review comment appears (if GitHub App configured).

---

## 11. Phase 7 — Custom domain + free SSL

Both services include **free managed certificates** — do not buy one.

- **Frontend (SWA):** Portal → Static Web App → **Custom domains → Add** → enter `app.yourdomain.com` → add the shown `CNAME` at your DNS provider → validation is automatic (usually <10 min). Apex domains: use the `ALIAS`/`ANAME` record SWA shows. Then update `FRONTEND_URL`/`ALLOWED_ORIGINS` (Phase 4.1) + Clerk allowed origins (Phase 4.2) to the custom domain and redeploy.
- **Backend (Container Apps):** Portal → Container App → **Custom domains → Add** → add `api.yourdomain.com` → create the `CNAME` → Azure provisions + auto-renews the cert. Update `NEXT_PUBLIC_API_URL` (GitHub secret + SWA Configuration) to `https://api.yourdomain.com` and push to rebuild frontend.

Keep the default `*.azurestaticapps.net` / `*.azurecontainerapps.io` hostnames working as fallback origins during the transition (append, don’t replace, `ALLOWED_ORIGINS` with a comma-separated pair).

---

## 12. Day-2 operations (logs, updates, backups, start/stop)

### Logs (free within grant)

```bash
# Live backend logs (last 100 lines + follow)
az containerapp logs show --name $APP -g $RG --follow --tail 100
# SWA: Portal → Static Web App → Monitoring → Diagnostic logs (build vs function logs are separate blades)
# Query failures in Log Analytics (Portal → Logs):
#   ContainerAppConsoleLogs_CL | where ContainerAppName_s == "ca-traceiq-backend" | where Log_s contains "ERROR" | take 50
```

Cap ingestion: Log Analytics → **Usage and estimated costs → Daily cap** = 1 GB/day, retention 30 days. Verbose uvicorn access logs are the usual quota eater — keep default log level (don’t enable `--log-level debug` in production).

### Zero-downtime updates

```bash
# Backend: push new image, then update (new revision, traffic shifts automatically)
docker build --platform linux/amd64 -t ghcr.io/$GH_USER/traceiq-backend:<sha> ./backend
docker push ghcr.io/$GH_USER/traceiq-backend:<sha>
az containerapp update --name $APP -g $RG --image ghcr.io/$GH_USER/traceiq-backend:<sha>
# Frontend: just push to main — SWA Oryx rebuilds. Preview environments per-PR are Free-plan safe; delete merged ones.

# Database migrations on every backend release (from laptop or Cloud Shell):
export DATABASE_URL="<prod-url>"
cd backend && uv run alembic upgrade head
```

Never bake migrations into container startup on ACA Consumption — concurrent scale-from-zero replicas would race `alembic upgrade`. Run them explicitly per release (or as a one-shot `az containerapp job`).

### Backups

- **NeonDB:** automatic point-in-time recovery within the free retention window — plus manual dump before risky migrations: `pg_dump "<DATABASE_URL>" > backup-$(date +%F).sql`. Neon branches also give you copy-on-write snapshots for pre-migration safety.
- **Upstash:** Redis holds only Celery broker/result data (recreatable, 24h expiry) — no backup needed. Anything persistent lives in NeonDB.

### Start/stop to save credit

Nothing to stop: the backend scales to zero on its own, SWA Free is free, and NeonDB/Upstash autosuspend on their free tiers. Your only recurring habit is the weekly cost check in Phase 9.

---

## 13. Phase 9 — Cost-control playbook

Weekly 2-minute routine:

1. **Cost analysis:** Portal → Cost Management → filter Resource Group `rg-traceiq-prod` → confirm forecast <$5. (NeonDB + Upstash billing is checked in their own dashboards — both should read $0 on free tiers.)
2. **Kill orphans:** Container Apps → Revisions → deactivate old inactive revisions; SWA → Environments → delete merged preview envs; GHCR → prune old image tags.
3. **Rightsize check:** ACA Metrics → `ReplicaCount` should sit at 0 overnight; sustained >1 average means lower `max-replicas` or raise the HTTP scale rule threshold (Portal → Scale → from 10 concurrent requests to 20).
4. **Free-tier quotas:** Neon dashboard → usage within free storage/compute allowance (one prod branch, no stray branches); Upstash dashboard → commands/storage within free quota (24h result expiry keeps this flat).
5. **Secrets rotation quarterly:** Clerk keys, Gemini key, GHCR PAT, NeonDB + Upstash credentials, GitHub App private key. Rotate via `az containerapp secret set` + SWA Configuration — no redeploy needed for backend, rebuild needed only for `NEXT_PUBLIC_*`.

Spending guardrails summary: **Upstash-only Redis, NeonDB-only Postgres, no ACR, no App Service plan, no VM, no Azure Postgres/Redis of any SKU, minReplicas 0 everywhere, one region, budget alert at $60/$80.** Follow these and the $100 covers the full academic year.

---

## 14. Troubleshooting matrix

| # | Symptom | Cause (most likely) | Fix |
|---|---|---|---|
| 1 | `/api/v1/health` → `database: unhealthy` | Wrong NeonDB `DATABASE_URL` | `az containerapp logs show` → look for `connection refused/timeout`. Check: pooled (not direct) host, password with special chars URL-encoded, `?sslmode=require` present. Confirm `CREATE EXTENSION vector;` + `pg_trgm` ran in the **`traceiq`** database (not `postgres`) — Phase 5A step 2. Neon autosuspend wakes on first connect (~seconds) — retry once before debugging further. |
| 2 | Frontend: `Failed to fetch` / CORS errors | `ALLOWED_ORIGINS` stale | Re-run Phase 4.1 with the exact SWA hostname (no trailing slash). Wait 2 min for new revision. Hard-refresh (Ctrl+Shift+R) — SWA edge caches aggressively. |
| 3 | Clerk sign-in loops / redirects to localhost | Env mismatch | All three must agree: GitHub secret `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + SWA Configuration + backend `CLERK_SECRET_KEY` from the **same** Clerk instance (test↔test or live↔live). Clerk Dashboard paths + allowed origins must include the SWA host. Rebuild frontend after any `NEXT_PUBLIC_*` change. |
| 4 | SWA build fails: `250 MB limit` / OOM | Full Next.js bundle too large | Add `output: "standalone"` to `frontend/next.config.ts` (repo already branches on `DOCKER_BUILD=1` — extend to always-standalone for SWA) + build script `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/` per Microsoft hybrid-Next.js guidance. Remove heavy deps from the client bundle. |
| 5 | Backend cold start ~10–15 s | Expected with minReplicas 0 | Not a bug. If UX-critical, set minReplicas 1 **knowingly** (≈$5–9/mo idle at 0.5 vCPU/1 GiB) — or add a free uptime-ping (GitHub Actions cron hitting `/liveness` every 10 min) to keep one replica warm within the free grant. |
| 6 | `asyncio.run() cannot be called from a running event loop` | Custom code bypassing `runner.py` | Use `app/workers/runner.py:run_async` for all background dispatch (the repo’s event-loop guard). Do not call Celery tasks with `.get()` inside async routes. |
| 7 | Celery worker starts but never picks up tasks | `ENVIRONMENT=production` forces eager, or wrong `REDIS_URL` | Expected per `config.py:87-97`. Worker path requires `ENVIRONMENT=staging` + `USE_CELERY=true` + `CELERY_ALWAYS_EAGER=false` + **the same Upstash `rediss://` URL** on **both** API and worker (Phase 5). Plain `redis://` (no TLS) against Upstash fails — must be `rediss://`. |
| 8 | `CREATE EXTENSION vector` → permission denied | Wrong Neon role/database | Run as the Neon project owner in the Neon SQL Editor, connected to the `traceiq` database (not `postgres`). No allowlist step exists on Neon — `CREATE EXTENSION vector;` works directly. |
| 9 | Student sub: `SKU not available` / region denied | Dynamic student quota limits | Retry the same command in `centralus` (keep all resources together). Never pick Premium/HA SKUs on a student sub — they are quota-blocked by design. |
| 10 | Image pull fails: `unauthorized` from ghcr.io | Private package + missing secret | Make package public (simplest) or re-apply the private-registry note in 6.3 with a fresh PAT (`read:packages`). Then `az containerapp update --image` to force a re-pull. |
| 11 | Alembic: `Can't locate revision` / partial upgrade | Migrations run from two places at once | Run `alembic upgrade head` from exactly one place per release (laptop). Check `alembic_version` table; never auto-run on container boot with minReplicas 0. |
| 12 | Gemini 429 / quota errors | Free AI Studio rate limits | The multi-provider router (`AI_STRATEGY=round_robin`, `AI_PROVIDER_ORDER`) falls back to OpenCode/Groq if configured; otherwise add exponential backoff and move bulk embedding (initial repo index) to off-peak hours. Light demos never hit limits. |

---

## 15. Teardown (to stop burning credit)

```bash
# Nuke everything billable but keep the resource group + SWA Free (both $0):
az containerapp delete --name ca-traceiq-backend -g rg-traceiq-prod -y
az containerapp delete --name ca-traceiq-worker -g rg-traceiq-prod -y 2>/dev/null
# NeonDB + Upstash free tiers cost nothing — pause/delete them in their own
# dashboards (Neon: delete project `traceiq`; Upstash: delete `traceiq-redis`)
# only if you want the data gone. Frontend SWA Free + GHCR images: leave them.

# Full Azure cleanup (end of semester):
az group delete --name rg-traceiq-prod -y
```

Verify $0 forecast in Cost Management 24h after teardown (usage attribution lags).

---

## 16. Appendix A — Full environment variable reference

### Backend (`az containerapp secret set` for secrets, `--set-env-vars` for the rest)

| Variable | Required | Value in this guide | Source file |
|---|---|---|---|
| `ENVIRONMENT` | yes | `production` | `config.py:20` |
| `DATABASE_URL` | yes (secret) | NeonDB pooled URL `postgresql://...neon.tech:5432/traceiq?sslmode=require` | `config.py:23`, normalized at `:99-109` |
| `REDIS_URL` | yes (secret) | Upstash TLS URL `rediss://default:<pass>@<endpoint>.upstash.io:6379` (unused while eager; live broker when Celery ON) | `config.py:26`, `celery_app.py:23,54-62` |
| `USE_CELERY` / `CELERY_ALWAYS_EAGER` | yes | `false` / `true` | `config.py:81-84`, `render.yaml:17-21` |
| `GEMINI_API_KEY` (+ mirror `GOOGLE_API_KEY`) | yes (secret) | AI Studio key | `config.py:37-39` |
| `GEMINI_MODEL` / `LLM_MODEL` | yes | `gemini/gemini-2.5-flash` | `config.py:38,56-57` |
| `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | yes | `gemini/gemini-embedding-2` / `384` | `config.py:58-59` |
| `OPENCODE_*` / `GROQ_*` / `OPENAI_*` | optional | empty unless failover needed | `config.py:41-54` |
| `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` / `CLERK_JWKS_URL` | yes (secrets) | from Clerk Dashboard | `config.py:62-65` |
| `GITHUB_APP_ID` / `GITHUB_PRIVATE_KEY` / `GITHUB_WEBHOOK_SECRET` | only for auto-reviews | App settings | `config.py:68-70` |
| `FRONTEND_URL` / `ALLOWED_ORIGINS` | yes | `https://<swa-host>` | `config.py:73-75`, parsed at `:111-127` |
| `SNAPSHOT_DIR` | yes | `data/snapshots` (ephemeral on ACA — use R2 for persistence) | `config.py:78` |
| `R2_*` | optional | Cloudflare R2 keys if tarball persistence needed | `config.py:29-32` |
| `PORT` / `WEB_CONCURRENCY` | yes | `8000` / `1` | `backend/Dockerfile:28` |

### Frontend (GitHub Secrets **and** SWA Configuration)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<backend-fqdn>` — consumed by `frontend/lib/api/config.ts:1` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Same Clerk instance, both sides |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-in` / `/sign-up` |

---

## 17. Appendix B — CLI cheat sheet

```bash
# Identity / context
az login && az account show --output table
export RG=rg-traceiq-prod LOCATION=eastus APP=ca-traceiq-backend

# Backend: fqdn, logs, revisions, scale, update image
az containerapp show -n $APP -g $RG --query properties.configuration.ingress.fqdn -o tsv
az containerapp logs show -n $APP -g $RG --follow --tail 100
az containerapp revision list -n $APP -g $RG -o table
az containerapp update -n $APP -g $RG --min-replicas 0 --max-replicas 2 --cpu 0.5 --memory 1.0Gi
az containerapp update -n $APP -g $RG --image ghcr.io/<user>/traceiq-backend:<new-tag>

# Frontend hostname
az staticwebapp show --name swa-traceiq -g $RG --query defaultHostname -o tsv

# (No Postgres/Redis CLI — NeonDB + Upstash are managed in their own dashboards,
#  not via `az`. Neon: neon.tech dashboard; Upstash: console.upstash.com.)

# Spend check
az consumption usage list --start-date 2026-10-01 --end-date 2026-10-31 2>/dev/null | head -50
# (Portal → Cost Management is authoritative; CLI usage API varies by offer type.)
```

---

## 18. Appendix C — Why NOT App Service / VM / ACR / Azure Redis / Azure Postgres

| Alternative | Why rejected for $100 student budget (Oct 2026 pricing) |
|---|---|
| **App Service B1 backend** | Always-on dedicated VM billing (~$13+/mo Linux at list, higher in some regions) with no scale-to-zero. Sleeps nothing, saves nothing. ACA Consumption does the same FastAPI workload for ~$0 idle. |
| **Single VM (B1s) + docker-compose.yml** | VM ~$7.60/mo + SSD + public IP + your time patching OS/Nginx/Certbot (`deploy/`, `nginx/`, `scripts/init-letsencrypt.sh` in this repo target this path). Cheaper than App Service but still always-on, single point of failure, no free managed SSL/CDN for frontend. |
| **Azure Container Registry** | Basic ~$5/mo to store what GHCR stores free. No feature in this project needs ACR (no VNet-integrated pulls, no geo-replication). |
| **Azure Cache for Redis (any tier)** | Basic starts ~$16+/mo — more than the entire stack in this guide. Upstash free tier provides the same broker/cache for $0 with TLS, and the app auto-configures SSL for `rediss://`. Never created in this guide. |
| **Azure Database for PostgreSQL (any tier)** | Burstable B1ms alone is ~$15–17/mo all-in (compute + storage + backup); General-Purpose/HA/replicas are 4–10× that. NeonDB free tier runs the same pgvector + HNSW workload for $0. Never created in this guide. |
| **SWA Standard** | ~$9/mo per environment for SLA + more bandwidth you don’t need yet. Free covers custom domains + SSL + 100 GB. Upgrade only when bandwidth or SLA contractually requires it. |

---

*End of guide. Next action: complete Phase 0 (resource group + budget alert), then Phase 1 (NeonDB ~10 min + Upstash ~5 min) — you will have database + Redis wired before spending a single cent of the $100.*
