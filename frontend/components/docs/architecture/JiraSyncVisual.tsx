"use client";

import React, { useState } from "react";
import { 
  Kanban, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Lock,
  Sparkles,
  Activity,
  Terminal,
  Layers
} from "lucide-react";

export function JiraSyncVisual() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      title: "1. HMAC Webhook Ingress",
      badge: "Inbound Stream",
      description: "Jira Cloud/Server triggers webhook on issue status change or description edit. TraceIQ verifies HMAC-SHA256 signature and returns 200 OK ACK in < 40ms.",
      color: "border-sky-500 bg-sky-500/10 text-sky-400",
    },
    {
      title: "2. Isolated DB Session",
      badge: "Background Task",
      description: "Background worker uses isolated AsyncSessionLocal instance to prevent connection leaks, updating priority, issue type, and timestamps.",
      color: "border-purple-500 bg-purple-500/10 text-purple-400",
    },
    {
      title: "3. Requirement Drift Detection",
      badge: "Safety Guard",
      description: "If Jira ticket description or AC changes mid-sprint, TraceIQ flags an audit event and warns developers instead of silently overriding local requirements.",
      color: "border-amber-500 bg-amber-500/10 text-amber-400",
    },
    {
      title: "4. Outbound Transitions & ADF Comments",
      badge: "Outbound Delivery",
      description: "Developers transition Jira tickets from TraceIQ dashboard (e.g. In Review -> Done) and auto-post rich formatted ADF comments with blast radius metrics.",
      color: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
    },
  ];

  return (
    <div className="my-6 rounded-2xl bg-[#0B132B] text-slate-200 border border-white/15 overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="px-5 py-3.5 bg-[#111C3A] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Kanban className="w-4 h-4 text-sky-400" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            BIDIRECTIONAL JIRA SYNC PIPELINE
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Native HMAC-SHA256
        </span>
      </div>

      {/* Visual Pipeline Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                activeStep === idx
                  ? "bg-white/10 border-white/40 shadow-lg scale-[1.02]"
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
            </div>
          ))}
        </div>

        {/* Interactive Deep-Dive Details Box */}
        <div className="mt-5 p-4 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="font-bold text-white font-serif">
                {activeStep === 0 && "Inbound HMAC Signature Security"}
                {activeStep === 1 && "Isolated Session Lifecyle Management"}
                {activeStep === 2 && "Autonomous Drift Detection & Alerts"}
                {activeStep === 3 && "Rich ADF Commenting & Status Transitions"}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                {activeStep === 0 && "Verifies X-Hub-Signature against integ.webhook_secret using crypto.timingSafeEqual."}
                {activeStep === 1 && "Decoupled from HTTP request lifecycle; prevents sqlalchemy.orm.exc.DetachedInstanceError."}
                {activeStep === 2 && "Detects when PM changes scope in Jira while code is in review, protecting PR traceability."}
                {activeStep === 3 && "Converts markdown summaries into nested Atlassian Document Format JSON blocks."}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-1 rounded bg-white/10 text-slate-300 text-[10px]">
              POST /api/v1/jira/webhook/test
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
