"use client";

import React, { useState } from "react";
import { Kanban, RefreshCw, ShieldCheck, KeyRound, Lock } from "lucide-react";

export function JiraSyncVisual() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      title: "1. Zero-Click OAuth 2.0 (3LO)",
      badge: "CSRF Protected",
      description:
        "Authorize Atlassian Cloud via single-use Redis CSRF state, resolve cloud_id via accessible-resources, and store tokens Fernet enc:v1 encrypted.",
      detailTitle: "AES-128 + HMAC-SHA256 at Rest & Distributed Token Lock",
      detailBody:
        "Atlassian rotating refresh tokens use Redis SET NX single-flight locking (acquire_lock / release_lock) so concurrent API calls never invalidate the active grant.",
      endpoint: "POST /api/v1/jira/oauth/authorize",
      color: "border-sky-500 bg-sky-500/10 text-sky-400",
    },
    {
      title: "2. Auto-Registered Webhooks",
      badge: "Dynamic REST v3",
      description:
        "Upon OAuth callback, TraceIQ registers a scoped HTTPS webhook on Jira Cloud with automatic 30-day renewal (skipped gracefully on localhost HTTP).",
      detailTitle: "Per-Tenant Webhook Routing & Verification",
      detailBody:
        "Validates webhook secret digests and resolves the matching workspace JiraIntegration row strictly per tenant.",
      endpoint: "POST /api/v1/jira/oauth/webhook/sync",
      color: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
    },
    {
      title: "3. Versioned Auto-Sync & ADF Parse",
      badge: "Webhook-First",
      description:
        "Inbound issue updates convert ADF JSON into Markdown, bump RequirementVersion snapshots (v1 -> v2), and log jira.drift_detected audit events.",
      detailTitle: "Preserved Version History & Localhost Fallback",
      detailBody:
        "Updates requirement specs, status, priority, and type cleanly without losing prior versions, falling back to POST /api/v1/jira/requirements/sync-all on localhost tab return.",
      endpoint: "POST /api/v1/jira/webhook",
      color: "border-amber-500 bg-amber-500/10 text-amber-400",
    },
    {
      title: "4. Outbound Transitions & Comments",
      badge: "Bidirectional Sync",
      description:
        "Engineers transition Jira tickets directly from TraceIQ (e.g. In Progress -> Done) and post Markdown-to-ADF verification comments.",
      detailTitle: "Rich ADF Commenting & Workflow Transitions",
      detailBody:
        "Translates TraceIQ PR review findings and verification summaries back into native Atlassian Document Format blocks.",
      endpoint: "POST /api/v1/jira/requirements/{req_id}/transition",
      color: "border-purple-500 bg-purple-500/10 text-purple-400",
    },
  ];

  const current = steps[activeStep];

  return (
    <div className="my-6 rounded-2xl bg-[#0B132B] text-slate-200 border border-white/15 overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="px-5 py-3.5 bg-[#111C3A] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Kanban className="w-4 h-4 text-sky-400" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            JIRA OAUTH 2.0 (3LO) &amp; AUTO-WEBHOOK PIPELINE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            Fernet enc:v1
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Redis Token Lock
          </span>
        </div>
      </div>

      {/* Visual Pipeline Grid */}
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, idx) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                activeStep === idx
                  ? "bg-white/10 border-white/40 shadow-lg scale-[1.01]"
                  : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${step.color}`}>
                  {step.badge}
                </span>
                <span className="text-[10px] font-mono text-slate-400">0{idx + 1}</span>
              </div>
              <h5 className="font-serif font-bold text-xs text-white mt-1">
                {step.title}
              </h5>
              <p className="text-[11px] text-slate-300 font-sans mt-1.5 leading-snug">
                {step.description}
              </p>
            </button>
          ))}
        </div>

        {/* Interactive Deep-Dive Details Box */}
        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              {activeStep === 0 ? (
                <Lock className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-bold text-white font-serif">{current.detailTitle}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-sans">{current.detailBody}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded bg-white/10 text-slate-200 text-[10px]">
              {current.endpoint}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
