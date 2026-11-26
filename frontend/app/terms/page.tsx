import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageShell } from "@/components/landing/PublicPageShell";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service governing access to TraceIQ, GitHub and Atlassian Jira Cloud / Confluence integrations, AI Human-in-the-Loop governance, and data ownership.",
  alternates: {
    canonical: "/terms",
  },
};

const EFFECTIVE_DATE = "November 26, 2026";

export default function TermsPage() {
  return (
    <PublicPageShell>
      {/* Editorial Header */}
      <div className="space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2A4A]/8 border border-[#1B2A4A]/15 text-[11px] font-mono uppercase tracking-wider text-[#1B2A4A] font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Legal &amp; Platform Governance</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-5xl text-[#111111] tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs font-mono text-[#6B7280]">
          Effective Date: {EFFECTIVE_DATE}
        </p>
      </div>

      <article className="bg-white rounded-2xl border border-[#1B2A4A]/12 p-6 sm:p-10 shadow-xs space-y-8 text-sm text-[#374151] leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using TraceIQ (including our web application, APIs, GitHub App, and Atlassian Jira / Confluence integrations), you agree to be bound by these Terms of Service and our{" "}
            <Link href="/privacy" className="text-[#1B2A4A] font-semibold underline">
              Privacy Policy
            </Link>
            . If you connect a workspace on behalf of an organization, you represent that you have authority to bind that organization.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            2. Ownership of Your Code &amp; Requirements
          </h2>
          <p>
            You retain 100% ownership and intellectual property rights over all source code repositories, AST indices, pull requests, requirements, and Jira or Confluence content connected to TraceIQ. You grant TraceIQ a limited, revocable license strictly to ingest, parse, embed, and analyze your authorized artifacts to provide platform features to your workspace.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            3. Third-Party Integrations (Atlassian &amp; GitHub)
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              When connecting Atlassian Jira Cloud via OAuth 2.0 (3LO) or API tokens, or installing the TraceIQ GitHub App, your use of those platforms remains governed by Atlassian&apos;s and GitHub&apos;s respective terms.
            </li>
            <li>
              TraceIQ acts strictly within the scopes you authorize (such as reading Jira issues, managing dynamic webhooks, posting review comments, or transitioning issue statuses at your direction).
            </li>
            <li>
              You are responsible for ensuring you possess proper authorization from your workspace or repository owner before indexing private repositories or syncing external issue trackers.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            4. AI Output &amp; Human-in-the-Loop Responsibility
          </h2>
          <p>
            TraceIQ&apos;s AI Agent, blast-radius scoring, pre-review standards audits, and pull request drafts are engineering decision-support tools designed with Human-in-the-Loop (HITL) checkpoints. Automated findings and confidence scores do not replace human engineering review, security testing, or CI verification. You remain solely responsible for reviewing and approving code changes, Jira status updates, and production deployments.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            5. Acceptable Use
          </h2>
          <p>
            You agree not to: (a) probe, bypass, or disrupt TraceIQ&apos;s multi-tenant workspace isolation or authentication controls; (b) submit malicious payloads or automated abuse targeting TraceIQ APIs or third-party webhooks; or (c) upload unlawful content or credentials you are not authorized to share.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            6. Open-Source License &amp; Warranty Disclaimer
          </h2>
          <p>
            TraceIQ&apos;s open-source components are distributed under the MIT License. The hosted beta service (`v0.1.0-beta`) is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of uninterrupted availability, fitness for a particular purpose, or error-free AI output. To the maximum extent permitted by law, TraceIQ and its contributors shall not be liable for indirect, incidental, or consequential damages arising from platform use.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif font-bold text-xl text-[#111111]">
            7. Termination &amp; Contact
          </h2>
          <p>
            You may stop using TraceIQ and disconnect all GitHub or Atlassian integrations at any time. For support, policy inquiries, or workspace termination assistance, contact us at{" "}
            <Link href="/contact" className="text-[#1B2A4A] font-semibold underline">
              /contact
            </Link>
            .
          </p>
        </section>
      </article>
    </PublicPageShell>
  );
}
