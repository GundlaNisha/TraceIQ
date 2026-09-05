"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Kanban, Zap, RefreshCw, CheckCircle2, Lock, ExternalLink, Activity, Radio, ShieldCheck, Terminal } from "lucide-react";
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
          Atlassian Jira REST API &amp; Bidirectional Sync
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#555E6D] leading-relaxed">
          TraceIQ connects seamlessly with Atlassian Jira Cloud and Jira Server. Engineering teams can import requirements directly from Kanban boards and Scrum sprints, convert complex nested Atlassian Document Format (ADF) into clean Markdown, transition issue workflow statuses, and receive real-time updates via HMAC-verified webhooks.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Interactive Visual Architecture Diagram */}
      <section className="space-y-4">
        <h2 id="jira-sync-pipeline" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111]">
          Bidirectional Synchronization Architecture
        </h2>
        <p className="text-sm text-[#555E6D] font-sans">
          How inbound webhooks and outbound status transitions flow between Atlassian Jira and TraceIQ:
        </p>
        
        {/* Custom Visual Component */}
        <JiraSyncVisual />
      </section>

      {/* Setup & Credentials */}
      <section className="space-y-4 pt-2">
        <h2 id="jira-connection-setup" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Connecting Jira to your Workspace
        </h2>
        <p>
          TraceIQ communicates with the standard Jira REST API using Basic Authentication (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">email:api_token</code>). Credentials are encrypted and scoped to the active workspace.
        </p>

        <ol className="list-decimal pl-5 space-y-2 text-sm text-[#333333]">
          <li>
            Navigate to <strong>Requirements</strong> in TraceIQ and click <strong>&quot;Import from Jira&quot;</strong>.
          </li>
          <li>
            In the Jira Configuration modal, enter your <strong>Jira Domain</strong> (e.g. <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">https://mycompany.atlassian.net</code>).
          </li>
          <li>
            Enter your Atlassian account email address.
          </li>
          <li>
            Generate an Atlassian API Token from your <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="underline font-semibold text-accent inline-flex items-center gap-0.5">Atlassian Security Settings <ExternalLink className="w-3 h-3" /></a> and paste it into the token field.
          </li>
          <li>
            Click <strong>&quot;Test Connection&quot;</strong> to verify connectivity and API scopes before saving.
          </li>
        </ol>

        <DocsCallout type="tip" title="API Token Security & Masking">
          Your Atlassian API token is never exposed to the client in plain text. Responses from <code className="font-mono">GET /api/v1/jira/config</code> return a masked preview (e.g. <code className="font-mono">ATAT...xxxx</code>).
        </DocsCallout>
      </section>

      {/* ADF to Markdown Converter */}
      <section className="space-y-4 pt-2">
        <h2 id="adf-to-markdown" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Atlassian Document Format (ADF) Parser
        </h2>
        <p>
          Jira Cloud v3 formats issue descriptions as complex nested JSON (Atlassian Document Format). TraceIQ includes a built-in recursive parser (<code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">app/modules/jira/services/adf_converter.py</code>) that automatically converts ADF nodes into clean GitHub-flavored Markdown:
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
          Transition Jira issue statuses directly from the TraceIQ dashboard (e.g. move a ticket from <em>In Progress</em> to <em>In Review</em> or <em>Done</em> once code impact analysis confirms complete test coverage).
        </p>
        <ul className="space-y-2 text-sm text-[#333333]">
          <li>• <strong>Dynamic Transitions:</strong> TraceIQ queries Jira for valid workflow transitions for the specific issue.</li>
          <li>• <strong>Audit Trail:</strong> Each transition is recorded in TraceIQ&apos;s append-only audit trail and can optionally post a confirmation comment to Jira.</li>
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

      {/* Webhooks, HMAC Security, and Test Ping */}
      <section className="space-y-4 pt-2">
        <h2 id="jira-webhooks" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Webhooks, HMAC Security &amp; Test Simulation
        </h2>
        <p>
          Register an incoming webhook in Jira to enable autonomous bidirectional sync. When a Jira issue status changes or description is edited, Jira notifies TraceIQ in real time.
        </p>

        <div className="space-y-3">
          <h3 className="font-serif font-bold text-base text-[#111111]">1. Configure Webhook in Jira</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-[#333333]">
            <li>Open the Jira Connection Modal in TraceIQ and copy your <strong>Webhook URL</strong> and <strong>Shared Secret</strong>.</li>
            <li>In Jira: <strong>Jira Settings &rarr; System &rarr; WebHooks &rarr; Create a WebHook</strong>.</li>
            <li>Set URL to <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">https://your-domain.com/api/v1/jira/webhook</code>.</li>
            <li>Paste the secret into the <strong>Secret</strong> field.</li>
            <li>Under Issue-related events, select <code className="font-mono text-xs">Issue: updated</code> and <code className="font-mono text-xs">Issue: deleted</code>.</li>
          </ol>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="font-serif font-bold text-base text-[#111111]">2. Test Webhook Ping Endpoint</h3>
          <p className="text-sm text-[#555E6D]">
            Verify webhook handling without triggering live changes in Jira using the built-in test simulation endpoint:
          </p>
          <DocsCodeBlock
            code={`POST /api/v1/jira/webhook/test
Content-Type: application/json
X-Workspace-Id: ws_123456

{
  "jira_issue_key": "PROJ-101",
  "simulated_status": "In Review"
}

Response (200 OK):
{
  "status": "success",
  "matched": true,
  "action_taken": "updated",
  "message": "Simulated webhook delivery processed successfully for PROJ-101 (status: In Review)"
}`}
            language="json"
            filename="Test Webhook Ping Simulation"
          />
        </div>

        <DocsCallout type="note" title="Requirement Drift Protection">
          If a product manager modifies the Jira issue description or summary while development is ongoing, TraceIQ flags the requirement with a <strong>Drift Detected</strong> audit event rather than silently overwriting your active requirement document.
        </DocsCallout>
      </section>

    </article>
  );
}
