import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageShell } from "@/components/landing/PublicPageShell";
import { ContactSupportForm } from "@/components/landing/ContactSupportForm";
import {
  BookOpen,
  Clock,
  ExternalLink,
  LifeBuoy,
  Lock,
  ShieldCheck,
  Terminal,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Customer Support & Contact",
  description:
    "Reach TraceIQ support for help with Atlassian Jira Cloud OAuth 2.0 integrations, GitHub App setup, security disclosures, or account data requests.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <PublicPageShell>
      {/* Editorial Header */}
      <div className="space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2A4A]/8 border border-[#1B2A4A]/15 text-[11px] font-mono uppercase tracking-wider text-[#1B2A4A] font-semibold">
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>Customer Support Contact</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-5xl text-[#111111] tracking-tight">
          How Can We Help?
        </h1>
        <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed max-w-2xl">
          Get technical assistance for TraceIQ integrations—including Atlassian Jira Cloud OAuth 2.0 setup, GitHub App PR audits, workspace RBAC, and data privacy requests.
        </p>
      </div>

      {/* Quick Support Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <a
          href="https://github.com/GundlaNisha/TraceIQ/issues"
          target="_blank"
          rel="noreferrer"
          className="bg-white rounded-2xl border border-[#1B2A4A]/12 p-5 shadow-2xs hover:border-[#1B2A4A]/35 transition group space-y-2"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1B2A4A]/8 text-[#1B2A4A] flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="font-serif font-bold text-base text-[#111111] flex items-center gap-1.5">
            <span>Issue Tracker</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#1B2A4A] transition" />
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Report bugs, webhook troubleshooting, or integration feature requests directly on GitHub.
          </p>
        </a>

        <Link
          href="/docs"
          className="bg-white rounded-2xl border border-[#1B2A4A]/12 p-5 shadow-2xs hover:border-[#1B2A4A]/35 transition group space-y-2"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="font-serif font-bold text-base text-[#111111]">
            Documentation Portal
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Step-by-step setup guides for Jira Cloud, GitHub App webhooks, and API endpoints.
          </p>
        </Link>

        <div className="bg-white rounded-2xl border border-[#1B2A4A]/12 p-5 shadow-2xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div className="font-serif font-bold text-base text-[#111111]">
            Response Window
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Standard support &amp; privacy requests are reviewed within <strong>1–2 business days</strong>.
          </p>
        </div>
      </div>

      {/* Interactive Support Ticket Form */}
      <ContactSupportForm />

      {/* Integration & Compliance Footnote */}
      <div className="mt-8 bg-white/70 rounded-2xl border border-[#1B2A4A]/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#6B7280]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[#1B2A4A] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[#111111]">
              Security &amp; Data Deletion Inquiries
            </p>
            <p className="leading-relaxed">
              For security vulnerability disclosures or Atlassian/GDPR personal data deletion requests, please select <em>Account &amp; Data Deletion Request</em> above—never paste API tokens, webhook secrets, or OAuth credentials in public issues.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] shrink-0">
          <Link href="/privacy" className="text-[#1B2A4A] hover:underline font-semibold inline-flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Privacy
          </Link>
          <Link href="/terms" className="text-[#1B2A4A] hover:underline font-semibold">
            Terms
          </Link>
        </div>
      </div>
    </PublicPageShell>
  );
}
