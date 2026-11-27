"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { ExternalLink } from "lucide-react";
import { JiraSyncVisual } from "../architecture/JiraSyncVisual";

export function JiraIntegrationDoc() {
  return (
    <article className="space-y-12 max-w-5xl text-[15px] leading-relaxed text-[#222222]">
      {/* Title & Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
          Documentation // Integrations
        </div>
        <h1 id="jira-integration-guide" className="text-3xl sm:text-5xl font-serif font-bold text-[#111111] tracking-tight">
          Atlassian Jira OAuth 2.0 (3LO) &amp; Bidirectional Sync
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#555E6D] leading-relaxed">
          TraceIQ connects seamlessly with Atlassian Jira Cloud via <strong>zero-click OAuth 2.0 (3LO) with Auto-Registered Webhooks</strong> or optional Manual API Tokens. Immediately after connecting, TraceIQ auto-fetches issues via <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">/rest/api/3/search/jql</code> with default-all preselection and selective opt-out, converts Atlassian Document Format (ADF) into Markdown, transitions workflow statuses, and keeps linked requirements auto-synced via webhooks or batch fallback.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Interactive Visual Architecture Diagram */}
      <section className="space-y-4">
        <h2 id="jira-sync-pipeline" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111]">
          Bidirectional Synchronization Architecture
        </h2>
        <p className="text-sm text-[#555E6D] font-sans">
          How Atlassian OAuth 2.0 (3LO), Fernet encryption, Redis single-flight token locks, auto-registered webhooks, and outbound workflow transitions flow between Jira Cloud and TraceIQ:
        </p>
        <JiraSyncVisual />
      </section>

      {/* Setup & Credentials */}
      <section className="space-y-4 pt-2">
        <h2 id="jira-connection-setup" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Connecting Jira to your Workspace
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-600/25 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Recommended // Zero-Click
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-[#111111]">
              Option A: OAuth 2.0 (3LO) + Auto-Webhook
            </h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#333333]">
              <li>Open <strong>Requirements</strong> &rarr; <strong>Connect Jira</strong> and click <strong>Connect with Jira (OAuth 2.0)</strong>.</li>
              <li>Authorize access to your Jira Cloud site on Atlassian&apos;s consent screen.</li>
              <li>TraceIQ verifies the single-use Redis CSRF <code className="font-mono">state</code>, encrypts your tokens at rest, and automatically registers an HTTPS webhook (when <code className="font-mono">PUBLIC_BACKEND_URL</code> is HTTPS).</li>
            </ol>
          </div>

          {/* Option B */}
          <div className="p-5 rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-[#1B2A4A] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Fallback // Basic Auth
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-[#111111]">
              Option B: Manual API Token
            </h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#333333]">
              <li>Switch to the <strong>Manual API Token</strong> tab inside the Jira modal.</li>
              <li>Enter your Jira domain (e.g. <code className="font-mono">https://mycompany.atlassian.net</code>) and Atlassian email.</li>
              <li>Generate an API token in <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="underline font-semibold text-accent inline-flex items-center gap-0.5">Atlassian Security Settings <ExternalLink className="w-3 h-3" /></a>, click <strong>Test Connection</strong>, and save.</li>
            </ol>
          </div>
        </div>

        <DocsCallout type="tip" title="Auto-Fetch, Default-All Preselection & Idempotent Import">
          Upon connecting Jira, TraceIQ automatically opens the import browser and loads up to 100 accessible issues using Jira Cloud&apos;s bounded <code className="font-mono">GET /rest/api/3/search/jql</code> endpoint (with automatic Server <code className="font-mono">/search</code> fallback). All unimported issues are pre-selected by default while letting you uncheck any issue or switch to manual selection, and re-imports upsert safely by <code className="font-mono">(repository_id, jira_issue_key)</code>.
        </DocsCallout>

        <DocsCallout type="tip" title="Zero Plaintext Secrets & Rotating Token Safety">
          OAuth access tokens, rotating refresh tokens, and manual API tokens are encrypted at rest with <code className="font-mono">Fernet (enc:v1:)</code> via <code className="font-mono">CREDENTIAL_ENCRYPTION_KEY</code>. <code className="font-mono">GET /api/v1/jira/config</code> never exposes OAuth tokens or OAuth-managed webhook secrets to clients, and concurrent refresh attempts serialize behind a Redis distributed lock.
        </DocsCallout>
      </section>

      {/* ADF to Markdown Converter */}
      <section className="space-y-4 pt-2">
        <h2 id="adf-to-markdown" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Atlassian Document Format (ADF) Parser
        </h2>
        <p>
          Jira Cloud v3 formats issue descriptions as complex nested JSON (Atlassian Document Format). TraceIQ includes a recursive parser (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">app/modules/jira/services/adf_converter.py</code>) converting ADF nodes cleanly into GitHub-Flavored Markdown:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-2 shadow-sm">
            <span className="font-bold text-[#1B2A4A] uppercase text-[11px] tracking-wider">Jira ADF Element</span>
            <ul className="space-y-1 text-[#555E6D] font-sans pt-1">
              <li>• Headings (Levels 1–6)</li>
              <li>• Bullet and Numbered Lists</li>
              <li>• Code Blocks with syntax tags</li>
              <li>• Callout Panels (Info, Warning, Note)</li>
              <li>• Multi-column Tables &amp; Blockquotes</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#0B132B] text-slate-200 space-y-2 border border-white/10 shadow-sm">
            <span className="font-bold text-emerald-400 uppercase text-[11px] tracking-wider">Rendered Markdown</span>
            <ul className="space-y-1 text-slate-300 font-sans pt-1">
              <li>• <code className="text-purple-300"># Title</code> to <code className="text-purple-300">###### Title</code></li>
              <li>• <code className="text-purple-300">- List item</code> / <code className="text-purple-300">1. List item</code></li>
              <li>• <code className="text-purple-300">```python ... ```</code></li>
              <li>• <code className="text-purple-300">&gt; [!NOTE] ...</code></li>
              <li>• <code className="text-purple-300">| Header | Col |</code></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Jira Status Transitions */}
      <section className="space-y-4 pt-2">
        <h2 id="status-transitions" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Dynamic Jira Workflow Transitions
        </h2>
        <p>
          Transition Jira issue statuses directly from TraceIQ (e.g. moving an issue from <em>In Progress</em> to <em>In Review</em> or <em>Done</em> after impact verification). Every transition records an audit log entry and can post a formatted ADF comment to Jira.
        </p>
        <DocsCodeBlock
          code={`POST /api/v1/jira/requirements/{requirement_id}/transition
Content-Type: application/json
X-Workspace-Id: <workspace_uuid>

{
  "transition_id": "31",
  "post_comment": true,
  "comment": "Transitioned to In Review after TraceIQ blast radius verification."
}`}
          language="json"
          filename="Transition Jira Issue"
        />
      </section>

      {/* Webhooks, Auto-Registration, and Test Simulation */}
      <section className="space-y-4 pt-2">
        <h2 id="jira-webhooks" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Webhook-First Auto-Resync, Localhost Fallback &amp; Test Simulation
        </h2>
        <p>
          In OAuth 2.0 mode, TraceIQ automatically registers a dynamic webhook with Jira Cloud whenever <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">PUBLIC_BACKEND_URL</code> is a public <code className="font-mono text-xs bg-slate-100 px-1">https://</code> URL and refreshes its 30-day lease via <code className="font-mono text-xs bg-slate-100 px-1">POST /api/v1/jira/oauth/webhook/sync</code>. Inbound updates auto-resync summary, Markdown description, status, priority, and issue type into new <code className="font-mono text-xs bg-slate-100 px-1">RequirementVersion</code> rows while preserving history.
        </p>

        <DocsCallout type="note" title="Localhost Batch Fallback & ngrok Live Webhooks">
          Jira Cloud refuses private <code className="font-mono">http://localhost</code> webhook callbacks. Without a public URL, Requirements runs a quiet one-shot check on mount and tab return via <code className="font-mono">POST /api/v1/jira/requirements/sync-all</code> (or on click via <strong>Sync Jira</strong>). For real-time push webhooks locally, run <code className="font-mono">ngrok http 8000</code>, set <code className="font-mono">PUBLIC_BACKEND_URL=https://&lt;your-id&gt;.ngrok-free.app</code>, and click <strong>Register Webhook</strong>.
        </DocsCallout>

        <div className="space-y-3 pt-2">
          <h3 className="font-serif font-bold text-base text-[#111111]">In-App Test Simulation Endpoint</h3>
          <p className="text-sm text-[#555E6D]">
            Even without an external tunnel, verify webhook handling and Redis cache invalidation directly via the simulation endpoint:
          </p>
          <DocsCodeBlock
            code={`POST /api/v1/jira/webhook/test
Content-Type: application/json
X-Workspace-Id: ws_123456

{
  "issue_key": "SAM1-7",
  "new_status": "Done"
}`}
            language="json"
            filename="Webhook Delivery Simulation"
          />
        </div>
      </section>
    </article>
  );
}
