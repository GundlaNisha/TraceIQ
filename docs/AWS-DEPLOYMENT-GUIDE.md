# 🚀 TraceIQ Production Deployment Guide

This guide provides end-to-end production deployment instructions for **TraceIQ**, covering **AWS (EC2 / Lightsail / ECS)**, **DigitalOcean / VPS / Bare Metal**, **Docker Compose + Nginx + Let's Encrypt SSL**, and **Split Hosting (Vercel + Cloud Container)**.

---

## 🏗️ Architecture Overview

```
                          [ Internet / Users / GitHub Webhooks ]
                                            │
                                            ▼
                       [ Nginx Reverse Proxy (Port 80/443) ]
                       │   - Rate Limiting Zones (30r/s)
                       │   - Automated Let's Encrypt SSL (Certbot)
                       │   - Security Headers (HSTS, CSP, nosniff)
                       │   - Gzip & HTTP/2 Acceleration
                       │
             ┌─────────┴────────────────────────┐
             ▼                                  ▼
[ Next.js 16 Standalone ]            [ FastAPI Async Gateway ]
(Frontend: Port 3000)                (Backend: Port 8000)
- React 19 / Tailwind CSS            - AST Chunking & Tree-sitter
- Server Components                  - Google Gemini Embedding-2
- Dynamic XML Sitemap & Robots       - OpenCode Zen LLM Provider
                                                │
                                                ├───▶ [ Neon / Supabase PostgreSQL (pgvector) ]
                                                ├───▶ [ Redis Cache & Message Broker ]
                                                └───▶ [ Celery Async Background Workers ]
```

---

## 📋 Required Secrets & Environment Checklist

Before launching, ensure you have the following variables prepared:

| Environment Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string with `pgvector` | `postgresql+psycopg://user:pass@host/db?sslmode=require` |
| `REDIS_URL` | Redis broker & cache endpoint | `redis://redis:6379/0` (local) or Upstash/ElastiCache |
| `OPENAI_API_KEY` | OpenCode Zen or OpenAI API Key | `sk-...` |
| `OPENAI_API_BASE` | LLM Gateway URL | `https://opencode.ai/zen/v1` |
| `LLM_MODEL` | Free coding LLM model | `big-pickle` |
| `GEMINI_API_KEY` | Google AI Studio Key (100% Free) | `AQ.Ab8...` |
| `EMBEDDING_MODEL` | Vector embedding model | `gemini/gemini-embedding-2` |
| `EMBEDDING_DIMENSIONS` | Vector dimensionality | `384` |
| `CLERK_PUBLISHABLE_KEY` | Clerk Frontend Auth Key | `pk_test_...` or `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk Backend Secret | `sk_test_...` or `sk_live_...` |
| `CLERK_JWKS_URL` | Clerk JWKS public key endpoint | `https://<app>.clerk.accounts.dev/.well-known/jwks.json` |
| `GITHUB_APP_ID` | GitHub App ID | `4560621` |
| `GITHUB_PRIVATE_KEY` | GitHub App RSA Private Key | `MIIEpAIBAAKCAQ...` |
| `GITHUB_WEBHOOK_SECRET` | GitHub App Webhook HMAC Secret | `your_secret_hex` |
| `FRONTEND_URL` | Public application URL | `https://traceiq.ai` |

---

## 🎯 Deployment Option 1: AWS EC2 / Lightsail / VPS (Recommended)

This single-host topology uses Docker Compose, Nginx reverse proxy, and Certbot for a self-healing, cost-effective setup ($5 - $20/month).

### 1. Launch Server
- Launch an **Ubuntu 22.04 LTS or 24.04 LTS** instance (t3.small or t3.medium recommended, 2GB+ RAM).
- Ensure Security Group allows incoming ports:
  - `22` (SSH)
  - `80` (HTTP)
  - `443` (HTTPS)

### 2. Automated 1-Click Bootstrap
You can paste the contents of [`deploy/aws/user-data.sh`](file:///home/dracarys/Projects/personal-stuff/TraceIQ/deploy/aws/user-data.sh) directly into the AWS EC2 **User Data** field upon launch, or run:

```bash
curl -fsSL https://raw.githubusercontent.com/GundlaNisha/TraceIQ/main/deploy/aws/user-data.sh | sudo bash
```

### 3. Manual Step-by-Step Setup
```bash
# 1. Clone the repository
git clone https://github.com/GundlaNisha/TraceIQ.git /opt/traceiq
cd /opt/traceiq

# 2. Configure production secrets
cp backend/.env.production.example backend/.env.production
nano backend/.env.production

# 3. Create required directories
mkdir -p data/certbot/conf data/certbot/www data/snapshots

# 4. Provision Let's Encrypt SSL Certificates
export DOMAINS="traceiq.yourdomain.com www.traceiq.yourdomain.com"
export SSL_EMAIL="admin@yourdomain.com"
./scripts/init-letsencrypt.sh

# 5. Start all containers via systemd
sudo cp deploy/systemd/traceiq.service /etc/systemd/system/traceiq.service
sudo systemctl daemon-reload
sudo systemctl enable --now traceiq.service
```

---

## ☁️ Deployment Option 2: AWS ECS Fargate (Serverless Containers)

For auto-scaling enterprise workloads:

1. **Build & Push Images to Amazon ECR**:
   ```bash
   # Authenticate with ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com

   # Build & push backend
   docker build -t traceiq-backend:latest ./backend
   docker tag traceiq-backend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/traceiq-backend:latest
   docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/traceiq-backend:latest

   # Build & push frontend
   docker build -t traceiq-frontend:latest ./frontend
   docker tag traceiq-frontend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/traceiq-frontend:latest
   docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/traceiq-frontend:latest
   ```

2. **Register Task Definition**:
   Use [`deploy/aws/ecs-task-definition.example.json`](file:///home/dracarys/Projects/personal-stuff/TraceIQ/deploy/aws/ecs-task-definition.example.json) to create an ECS Fargate service attached to an **AWS Application Load Balancer (ALB)**.

3. **Target Group Health Check Path**:
   Set ALB target group health check path to `/api/v1/health` (port 8000) and `/` (port 3000).

---

## ⚡ Deployment Option 3: Split Hosting (Vercel Frontend + Render Backend)

### Frontend on Vercel:
1. Connect the GitHub repository to **Vercel**.
2. Set Root Directory to `frontend`.
3. Add Environment Variables:
   - `NEXT_PUBLIC_APP_URL`: `https://traceiqoffi.vercel.app`
   - `NEXT_PUBLIC_API_URL`: `https://your-backend.onrender.com`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_...`
   - `CLERK_SECRET_KEY`: `sk_...`
4. Click **Deploy**.

### Backend on Render / Container Cloud:
1. Create a new **Web Service** on Render.
2. Select **Docker** environment pointing to the root repository with Docker context set to `backend`.
3. Add environment variables from `backend/.env.production`.
4. Health check path: `/api/v1/health`.

---

## 🩺 Monitoring & Diagnostics

TraceIQ exposes deep health check probes:

- **Comprehensive Health Check**: `GET /api/v1/health`
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "environment": "production",
    "uptime_seconds": 3600,
    "timestamp": "2026-08-28T14:00:00Z",
    "services": {
      "database": "healthy",
      "redis": "healthy"
    }
  }
  ```
- **Lightweight Liveness Probe**: `GET /api/v1/health/liveness` ➡️ `{"status": "alive"}`
- **SEO XML Sitemap**: `GET /sitemap.xml`
- **Robots Directives**: `GET /robots.txt`

---

## 🔄 Zero-Downtime Updates & Rolling Restarts

To deploy new code updates on your live server:

```bash
cd /opt/traceiq
git pull origin main
docker compose build --no-cache
docker compose up -d --remove-orphans
```
