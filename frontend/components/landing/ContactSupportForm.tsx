"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, Send } from "lucide-react";

const ISSUE_BASE_URL = "https://github.com/GundlaNisha/TraceIQ/issues/new";

export function ContactSupportForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("jira-oauth");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const topicLabels: Record<string, string> = {
    "jira-oauth": "Jira Cloud OAuth 2.0 / Webhook Sync",
    "github-app": "GitHub App & PR Review Integration",
    "privacy-gdpr": "Account & Data Deletion Request",
    "security": "Security / Vulnerability Report",
    "general": "General Product Support",
  };

  const formattedBody = [
    `**Topic:** ${topicLabels[topic] || topic}`,
    `**Reporter:** ${name || "N/A"} (${email || "No email provided"})`,
    "",
    "**Details:**",
    message || "(Describe your question, workspace ID, or issue details)",
  ].join("\n");

  const handleOpenGitHubIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const title = encodeURIComponent(`[Support] ${topicLabels[topic] || "Inquiry"}`);
    const body = encodeURIComponent(formattedBody);
    window.open(`${ISSUE_BASE_URL}?title=${title}&body=${body}`, "_blank", "noopener,noreferrer");
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(formattedBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <form
      onSubmit={handleOpenGitHubIssue}
      className="bg-white rounded-2xl border border-[#1B2A4A]/12 p-6 sm:p-8 shadow-xs space-y-5"
    >
      <div className="space-y-1">
        <h2 className="font-serif font-bold text-xl text-[#111111]">
          Submit a Support Request
        </h2>
        <p className="text-xs text-[#6B7280] leading-relaxed">
          Prepare a pre-formatted support ticket for the TraceIQ engineering team via our official GitHub issue tracker, or copy the summary directly.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="support-name" className="block text-xs font-semibold text-[#111111]">
            Your Name
          </label>
          <input
            id="support-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            className="w-full rounded-xl border border-[#1B2A4A]/15 bg-[#F8F6F2]/50 px-3.5 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="support-email" className="block text-xs font-semibold text-[#111111]">
            Work Email
          </label>
          <input
            id="support-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@company.com"
            className="w-full rounded-xl border border-[#1B2A4A]/15 bg-[#F8F6F2]/50 px-3.5 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="support-topic" className="block text-xs font-semibold text-[#111111]">
          Support Category
        </label>
        <select
          id="support-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full rounded-xl border border-[#1B2A4A]/15 bg-[#F8F6F2]/50 px-3.5 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition"
        >
          <option value="jira-oauth">Jira Cloud OAuth 2.0 / Webhook Sync</option>
          <option value="github-app">GitHub App &amp; PR Review Integration</option>
          <option value="privacy-gdpr">Account &amp; Data Deletion Request</option>
          <option value="security">Security / Vulnerability Report</option>
          <option value="general">General Product Support</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="support-message" className="block text-xs font-semibold text-[#111111]">
          How can we help?
        </label>
        <textarea
          id="support-message"
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what happened, any error message (never include private tokens or secrets), and steps to reproduce..."
          className="w-full rounded-xl border border-[#1B2A4A]/15 bg-[#F8F6F2]/50 p-3.5 text-xs text-[#111111] focus:outline-none focus:border-[#1B2A4A] focus:bg-white transition resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleCopySummary}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#1B2A4A]/15 text-xs font-medium text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied Details" : "Copy Support Summary"}
        </button>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1B2A4A] hover:bg-[#16213E] text-[#F8F6F2] text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Open Support Ticket on GitHub</span>
          <ExternalLink className="w-3 h-3 opacity-80" />
        </button>
      </div>
    </form>
  );
}
