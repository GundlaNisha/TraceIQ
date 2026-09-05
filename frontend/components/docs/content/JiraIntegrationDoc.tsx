"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Kanban, Zap, RefreshCw, CheckCircle2, Lock, ExternalLink } from "lucide-react";

export function JiraIntegrationDoc() {
  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // Integrations
        </div>
        <h1 id="jira-integration-guide" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          Atlassian Jira REST API &amp; Kanban Sync
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          TraceIQ connects seamlessly with Atlassian Jira Cloud and Jira Server, enabling engineering teams to import requirements directly from Kanban boards, Scrum sprints, and Jira issue keys with automatic Atlassian Document Format (ADF) Markdown parsing.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Setup & Credentials */}
      <section className="space-y-4">
        <h2 id="jira-connection-setup" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Connecting Jira to your Workspace
        </h2>
        <p>
          TraceIQ uses the standard Jira REST API with Basic Authentication (<code className="font-mono bg-slate-100 px-1">email:api_token</code>). Credentials can be configured at the workspace level or per-user.
        </p>

        <ol className="list-decimal pl-5 space-y-2 text-xs text-[#111111]">
          <li>
            Navigate to <strong>Requirements</strong> in TraceIQ and click <strong>&quot;Import from Jira&quot;</strong>.
          </li>
          <li>
            In the Jira Configuration modal, enter your <strong>Jira Domain</strong> (e.g. <code className="font-mono">https://mycompany.atlassian.net</code>).
          </li>
          <li>
            Enter your Atlassian account email address.
          </li>
          <li>
            Generate an Atlassian API Token from your <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="underline font-semibold text-accent inline-flex items-center gap-0.5">Atlassian Security Settings <ExternalLink className="w-2.5 h-2.5" /></a> and paste it into the token field.
          </li>
          <li>
            Click <strong>&quot;Test Connection&quot;</strong> to verify your permissions before saving.
          </li>
        </ol>

        <DocsCallout type="tip" title="API Token Security & Masking">
          Your Atlassian API token is never exposed to the client in plain text. Responses from <code className="font-mono">GET /api/v1/jira/config</code> return a masked preview (e.g. <code className="font-mono">ATAT...xxxx</code>).
        </DocsCallout>
      </section>

      {/* ADF to Markdown Converter */}
      <section className="space-y-4 pt-4">
        <h2 id="adf-to-markdown" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Atlassian Document Format (ADF) Parser
        </h2>
        <p>
          Jira Cloud v3 formats issue descriptions as complex nested JSON (Atlassian Document Format). TraceIQ includes a built-in recursive parser (<code className="font-mono bg-slate-100 px-1">app/integrations/jira/adf_converter.py</code>) that automatically converts ADF nodes into clean GitHub-flavored Markdown:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-1">
            <span className="font-bold text-[#1B2A4A]">Jira ADF Element</span>
            <ul className="space-y-1 text-[#6B7280] font-sans pt-1">
              <li>• Headings (Levels 1–6)</li>
              <li>• Bullet and Numbered Lists</li>
              <li>• Code Blocks with syntax tags</li>
              <li>• Callout Panels (Info, Warning, Note)</li>
              <li>• Multi-column Tables</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1B2A4A] text-slate-200 space-y-1">
            <span className="font-bold text-emerald-400">Rendered Markdown</span>
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

      {/* Kanban & Sprint Browsing */}
      <section className="space-y-4 pt-4">
        <h2 id="kanban-and-sprints" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Browsing Kanban Boards &amp; Sprints
        </h2>
        <p>
          The Jira Import Dialog allows developers to filter by:
        </p>
        <ul className="space-y-1.5 text-xs text-[#111111]">
          <li>• <strong>Kanban &amp; Scrum Boards:</strong> Select active boards via the Jira Agile API (<code className="font-mono bg-slate-100 px-1">/rest/agile/1.0/board</code>).</li>
          <li>• <strong>Sprints:</strong> Filter by active, future, or closed sprints.</li>
          <li>• <strong>Status Categories:</strong> Quick toggle between <code className="font-mono bg-slate-100 px-1">All</code>, <code className="font-mono bg-slate-100 px-1">To Do / Backlog</code>, <code className="font-mono bg-slate-100 px-1">In Progress</code>, and <code className="font-mono bg-slate-100 px-1">Done</code>.</li>
          <li>• <strong>Dynamic Issue Types:</strong> Automatically loads all custom and standard issue types (Story, Task, Bug, Epic, To Do, Sub-task).</li>
        </ul>
      </section>

      {/* Upstream Sync */}
      <section className="space-y-4 pt-4">
        <h2 id="upstream-sync" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Upstream Requirement Synchronization
        </h2>
        <p>
          When product specifications change in Jira, click the <strong>&quot;Sync with Jira&quot;</strong> icon in the requirements table or trigger the sync API:
        </p>
        <DocsCodeBlock
          code={`POST /api/v1/jira/requirements/{requirement_id}/sync
Response:
{
  "requirement_id": "b3e2...41a",
  "jira_issue_key": "PROJ-142",
  "jira_status": "In Review",
  "updated": true,
  "new_version_number": 2,
  "message": "Requirement updated with latest Jira changes."
}`}
          language="json"
          filename="Jira Sync Endpoint"
        />
      </section>

      {/* Phase 2: Bidirectional Sync & Auto-Comments */}
      <section className="space-y-4 pt-4">
        <h2 id="bidirectional-comments" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Bidirectional Sync &amp; Auto-Comments
        </h2>
        <p>
          TraceIQ can post code impact analysis summaries and traceability metrics directly back onto the linked Jira issue (e.g. <code className="font-mono bg-slate-100 px-1">PROJ-123</code>) as formatted comments converted to Atlassian Document Format (ADF).
        </p>
        <p className="text-xs text-[#6B7280]">
          In the requirements table, click the <strong>&quot;Post to Jira&quot;</strong> icon on any linked requirement to either auto-generate an impact summary or supply custom Markdown notes.
        </p>
        <DocsCodeBlock
          code={`POST /api/v1/jira/requirements/{requirement_id}/post-comment
Content-Type: application/json

{
  "comment_body": "## 🔍 TraceIQ Analysis Complete\\n- **Impacted Files**: 4\\n- **Risk Level**: Medium"
}`}
          language="json"
          filename="Post Comment to Jira"
        />
      </section>

      {/* Phase 2: Jira Status Transitions */}
      <section className="space-y-4 pt-4">
        <h2 id="status-transitions" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Jira Status Transitions
        </h2>
        <p>
          Transition Jira issue statuses directly from the TraceIQ dashboard (e.g. move a ticket from <em>In Progress</em> to <em>In Review</em> or <em>Done</em> once code impact analysis confirms complete test coverage).
        </p>
        <ul className="space-y-1.5 text-xs text-[#111111]">
          <li>• <strong>Dynamic Transitions:</strong> TraceIQ queries Jira for valid workflow transitions for the specific issue.</li>
          <li>• <strong>Audit Trail:</strong> Each transition is logged in TraceIQ&apos;s append-only audit trail and can optionally post a confirmation comment to Jira.</li>
        </ul>
        <DocsCodeBlock
          code={`POST /api/v1/jira/requirements/{requirement_id}/transition
Content-Type: application/json

{
  "transition_id": "31",
  "post_comment": true,
  "comment": "Transitioned to In Review after automated TraceIQ verification."
}`}
          language="json"
          filename="Transition Jira Issue"
        />
      </section>

      {/* Phase 2: Webhooks & Drift Detection */}
      <section className="space-y-4 pt-4">
        <h2 id="jira-webhooks" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Jira Webhooks &amp; Requirement Drift Detection
        </h2>
        <p>
          Register an incoming webhook in Jira to enable autonomous bidirectional sync. When a Jira issue status changes or description is edited, Jira notifies TraceIQ in real time.
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-xs text-[#111111]">
          <li>Open the Jira Connection Modal in TraceIQ and click <strong>&quot;Generate Webhook Secret&quot;</strong>.</li>
          <li>Copy the generated <strong>Webhook URL</strong> and <strong>Shared Secret</strong>.</li>
          <li>In Jira Settings &rarr; System &rarr; WebHooks &rarr; <em>Create a WebHook</em>:</li>
          <li className="pl-4 list-none text-slate-600">
            • <strong>URL:</strong> <code className="font-mono bg-slate-100 px-1">https://your-domain.com/api/v1/jira/webhook</code><br />
            • <strong>Secret:</strong> Paste your shared secret<br />
            • <strong>Events:</strong> Check <code className="font-mono">Issue: updated</code> and <code className="font-mono">Issue: deleted</code>
          </li>
        </ol>
        <DocsCallout type="note" title="Requirement Drift Protection">
          If a product manager modifies the Jira issue description or summary while development is ongoing, TraceIQ flags the requirement with a <strong>Drift Detected</strong> audit event rather than silently overwriting your active requirement document.
        </DocsCallout>
      </section>

    </article>
  );
}

