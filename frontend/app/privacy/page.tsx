import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageShell } from "@/components/landing/PublicPageShell";
import { Lock, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "TraceIQ Privacy Policy detailing how account metadata, source code AST graphs, GitHub PR diffs, and Atlassian Jira/Confluence OAuth 2.0 data are encrypted, processed, and protected.",
  alternates: {
    canonical: "/privacy",
  },
};

const LAST_UPDATED = "November 26, 2026";

export default function PrivacyPage() {
  return (
    <PublicPageShell>
      {/* Editorial Header */}
      <div className="space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2A4A]/8 border border-[#1B2A4A]/15 text-[11px] font-mono uppercase tracking-wider text-[#1B2A4A] font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>Privacy &amp; Data Protection</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-5xl text-[#111111] tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs font-mono text-[#6B7280]">
          Effective &amp; Last Updated: {LAST_UPDATED}
        </p>
      </div>

      <article className="bg-white rounded-2xl border border-[#1B2A4A]/12 p-6 sm:p-10 shadow-xs space-y-8 text-sm text-[#374151] leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            1. Overview
          </h2>
          <p>
            TraceIQ (&ldquo;TraceIQ&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;) is an AI code impact analysis, AST dependency graph, and pull request review intelligence platform. Protecting customer source code, Jira/Confluence project artifacts, and identity records is foundational to our architecture.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            2. Information We Collect &amp; Process
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account &amp; Workspace Identity:</strong> Name, email address, user identifier, and workspace membership roles (`Owner`, `Admin`, `Member`, `Viewer`) authenticated via Clerk.
            </li>
            <li>
              <strong>Connected Source Repositories &amp; GitHub Metadata:</strong> Repository names, commit snapshots, Tree-sitter AST symbol definitions, dependency edges, semantic code chunks/embeddings (`pgvector`), pull request diffs, and CI workflow check metadata authorized via the TraceIQ GitHub App.
            </li>
            <li>
              <strong>Atlassian Jira Cloud &amp; Confluence Data (OAuth 2.0 / API Token):</strong> When you authorize TraceIQ on an Atlassian Cloud site, we access only the resources permitted by your granted scopes—such as Jira site URL (`cloudId`), projects, issue keys, summaries, descriptions, statuses, priorities, issue types, comments, and authorized Confluence space/page specifications—solely to import requirements, run impact analyses, detect specification drift via webhooks, and post analysis summaries you explicitly initiate.
            </li>
            <li>
              <strong>Audit &amp; Operational Telemetry:</strong> Append-only audit logs (`audit_logs`) recording actions such as repository syncs, Jira imports, webhook updates, and Human-in-the-Loop (HITL) agent approvals.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            3. Credential Security &amp; Encryption at Rest
          </h2>
          <div className="rounded-xl bg-[#F8F6F2] border border-[#1B2A4A]/12 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-xs text-[#1F2937] leading-relaxed">
              <strong>Zero Plaintext Client Exposure:</strong> All Atlassian OAuth 2.0 access tokens, rotating refresh tokens, Jira API tokens, and webhook shared secrets are encrypted at rest using Fernet authenticated encryption (AES-128-CBC + HMAC-SHA256) prior to storage in PostgreSQL and are never returned to client browsers or exposed in API responses.
            </p>
          </div>
          <p>
            Every workspace enforces strict multi-tenant scoping (`workspace_id` / `user_id` isolation), CSRF-protected single-use Redis state tokens during OAuth 2.0 authorization, and constant-time signature validation on inbound webhooks.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            4. AI Processing &amp; Zero Model Training
          </h2>
          <p>
            TraceIQ sends relevant requirement specifications, code snippets, or PR diffs to configured LLM providers strictly to perform requested blast-radius exploration, coding standards audits, and draft synthesis. We do <strong>not</strong> sell your code or Jira data, and we do not use customer repositories or requirements to train public foundation models.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            5. Third-Party Infrastructure &amp; Sub-Processors
          </h2>
          <p>
            To deliver TraceIQ reliably, data may be processed by trusted infrastructure providers: Clerk (user authentication), PostgreSQL / Neon (relational &amp; vector storage), Redis (ephemeral OAuth state, distributed locks, and task queuing), Cloudflare R2 / snapshot storage (archived source tarballs), GitHub, Atlassian, and your configured AI inference provider.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            6. Data Retention, Revocation &amp; Deletion Rights
          </h2>
          <p>
            You remain in full control of your connected data at all times:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Instant Integration Disconnect:</strong> Clicking <strong>Disconnect</strong> in Jira integration settings removes stored OAuth/API credentials immediately and unregisters TraceIQ&apos;s dynamic webhook on your Jira Cloud site. You can also revoke access anytime from your Atlassian Account connected apps settings.
            </li>
            <li>
              <strong>Repository &amp; Requirement Removal:</strong> Deleting a repository or requirement cascades deletion across associated indexed files, AST symbols, vector embeddings, and impact results.
            </li>
            <li>
              <strong>Account &amp; GDPR / Privacy Requests:</strong> To request full workspace or personal data export/erasure, please submit a request via our{" "}
              <Link href="/contact" className="text-[#1B2A4A] font-semibold underline">
                Customer Support Contact
              </Link>{" "}
              page.
            </li>
          </ul>
        </section>

        <section className="space-y-3 pt-4 border-t border-[#1B2A4A]/10 text-xs text-[#6B7280]">
          <p>
            Questions regarding this Privacy Policy? Visit{" "}
            <Link href="/contact" className="text-[#1B2A4A] font-semibold underline">
              /contact
            </Link>{" "}
            or review our{" "}
            <Link href="/terms" className="text-[#1B2A4A] font-semibold underline">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </article>
    </PublicPageShell>
  );
}
