"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { HelpCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

export function TroubleshootingDoc() {
  const faqs = [
    {
      q: "How does TraceIQ compare to generic AI code review bots?",
      a: "Generic bots review diffs in isolation without knowing your architecture. TraceIQ parses whole-repo AST graphs and traverses 2-hop downstream callers, catching transitive bugs and requirement regressions before merge.",
    },
    {
      q: "Does TraceIQ upload my entire proprietary codebase to third-party LLMs?",
      a: "No. Only relevant semantic code chunks (retrieved via sub-15ms hybrid RRF search) and AST call graphs are sent in the context window. Your full raw repository remains securely in your private database.",
    },
    {
      q: "Can I run TraceIQ completely self-hosted?",
      a: "Yes. TraceIQ is 100% open source under the MIT license. You can host the PostgreSQL database, Redis, FastAPI backend, and Next.js frontend on your own infrastructure or cloud VPC.",
    },
  ];

  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // Troubleshooting
        </div>
        <h1 id="troubleshooting-guide" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          Troubleshooting &amp; FAQ
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          Solutions to common environment configurations, database errors, worker concurrency questions, and frequently asked questions.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Common Issues */}
      <section className="space-y-6">
        <h2 id="common-errors" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Common Issues &amp; Diagnostic Fixes
        </h2>

        {/* Issue 1 */}
        <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-2">
          <h3 className="font-serif font-bold text-sm text-[#111111] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>1. PostgreSQL Error: &quot;type vector does not exist&quot;</span>
          </h3>
          <p className="text-xs text-[#6B7280]">
            This error occurs when the <code className="font-mono bg-slate-100 px-1">pgvector</code> extension has not been enabled in your PostgreSQL database before running Alembic migrations.
          </p>
          <DocsCodeBlock
            code="psql -d traceiq -c 'CREATE EXTENSION IF NOT EXISTS vector;'"
            language="bash"
          />
        </div>

        {/* Issue 2 */}
        <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-2">
          <h3 className="font-serif font-bold text-sm text-[#111111] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>2. Celery tasks remain in &quot;queued&quot; status</span>
          </h3>
          <p className="text-xs text-[#6B7280]">
            For local development without running a separate Redis and Celery worker process, set eager execution in <code className="font-mono">backend/.env</code>:
          </p>
          <DocsCodeBlock
            code="CELERY_ALWAYS_EAGER=true"
            language="env"
          />
        </div>

        {/* Issue 3 */}
        <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-2">
          <h3 className="font-serif font-bold text-sm text-[#111111] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>3. Jira Connection returns 401 Unauthorized</span>
          </h3>
          <p className="text-xs text-[#6B7280]">
            Ensure you are using your Atlassian account <strong>email address</strong> (not your username or display name) and that your API token was created under <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="underline font-semibold text-accent">Atlassian Security Settings</a>.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-4 pt-4">
        <h2 id="faq" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Frequently Asked Questions (FAQ)
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white border border-[#1B2A4A]/10 shadow-2xs space-y-1.5">
              <h4 className="font-serif font-bold text-sm text-[#111111]">{faq.q}</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

    </article>
  );
}
