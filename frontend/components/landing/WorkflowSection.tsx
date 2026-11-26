"use client";

import React, { useState } from "react";
import { 
  ChevronRight,
  Terminal,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export function WorkflowSection() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      id: "step-1",
      number: "01",
      title: "Zero-Click Jira OAuth 2.0 & Repo Link",
      badge: "OAuth 2.0 (3LO)",
      description:
        "Authorize Atlassian Jira in one click with Fernet-encrypted rotating tokens and auto-registered HTTPS webhooks, then connect GitHub repositories.",
      codeSnippet: `POST /api/v1/jira/oauth/authorize
-> Scoped CSRF Redis state issued
-> Auto-Webhook registered on Jira Cloud (30-day renewal)
-> Connected repo: enterprise/core-auth (RBAC Scoped)`,
      outputPreview: "Connected: Jira OAuth 2.0 Active + GitHub Webhook Verified",
    },
    {
      id: "step-2",
      number: "02",
      title: "High-Throughput AST Indexing",
      badge: "Tree-sitter Grammars",
      description:
        "Extracts symbols, class hierarchies, and call graphs with dense 384d embeddings and Redis-cached retrieval indices.",
      codeSnippet: `// Tree-sitter AST Chunker
[1/140] Parsed app/modules/auth/guard.py (3 symbols)
[2/140] Parsed app/db/session.py (2 symbols)
--> Ingested 420 code vectors into pgvector in 1.4s`,
      outputPreview: "Index Status: 100% Synced (0 MB Server RAM)",
    },
    {
      id: "step-3",
      number: "03",
      title: "Chat with Agent & Compute Blast Radius",
      badge: "LangGraph + 2-Hop AST",
      description:
        "Tag @repo, @req, or @pr in the AI Agent to trace 2-hop callers, audit test gaps, and confirm HITL checkpoints before writing code.",
      codeSnippet: `POST /api/v1/agent/sessions/{id}/messages
"Verify @req:SAM1-4 against @repo:enterprise/core-auth"
--> Supervisor -> verify_implementation -> HITL Gate
--> Risk: HIGH (6 callers flagged, confidence 0.968)`,
      outputPreview: "Blast Radius & Agent Audit Complete (6 Callers Flagged)",
    },
    {
      id: "step-4",
      number: "04",
      title: "Push Code & Correlate Live CI Checks",
      badge: "CI Blast-Radius Match",
      description:
        "Engineers push normally to GitHub. TraceIQ fetches live check runs, matches failing tests against impacted files, and tracks Actions MTTR/flakiness.",
      codeSnippet: `GET /api/v1/github/pull-requests/ci-correlation
{
  "verdict": "in_scope",
  "failing_check": "pytest tests/auth/test_rotation.py",
  "matched_blast_radius": ["app/modules/auth/guard.py"]
}`,
      outputPreview: "CI Correlation Verdict: IN_SCOPE (Overlaps Guard Module)",
    },
    {
      id: "step-5",
      number: "05",
      title: "Automated PR Review & Failover AI",
      badge: "Multi-Provider AI",
      description:
        "Evaluates per-file patch diffs with round-robin Gemini/Groq/OpenCode failover and posts line-level gap reviews directly on GitHub.",
      codeSnippet: `traceiq-bot commented on PR #142:
"Requirement Gap: Missing session invalidation
for expired refresh tokens in tests/test_auth.py"`,
      outputPreview: "GitHub Review Posted (1 Requirement Gap Flagged)",
    },
    {
      id: "step-6",
      number: "06",
      title: "Live Drift Sync & Traceability Matrix",
      badge: "Realtime Compliance",
      description:
        "Jira webhooks trigger drift alerts without overwriting active specs, while the traceability matrix records end-to-end verification.",
      codeSnippet: `GET /api/v1/traceability
{
  "repository": "enterprise/core-auth",
  "compliance_health_score": 96.4,
  "jira_webhook_status": "active",
  "verified_requirements": 18
}`,
      outputPreview: "Compliance Health: 96.4% (Audit Ready)",
    },
  ];

  return (
    <section id="workflow" className="py-20 md:py-28 bg-[#F8F6F2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A] text-xs font-mono tracking-wider uppercase mb-3 border border-[#1B2A4A]/15">
            <span>Workflow</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-[#111111] leading-tight">
            From requirement to merge <br />
            <span className="text-[#1B2A4A]">in six automated stages.</span>
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[#6B7280] font-sans leading-relaxed">
            Slots into your existing Git and Jira workflow without altering how developers write code.
          </p>
        </div>

        {/* Interactive Step Sequence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Step Selection List */}
          <div className="lg:col-span-5 space-y-2">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? "bg-white border-[#1B2A4A] shadow-sm scale-[1.01]"
                      : "bg-white/60 border-[#1B2A4A]/10 hover:bg-white hover:border-[#1B2A4A]/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          isActive
                            ? "bg-[#1B2A4A] text-white"
                            : "bg-[#1B2A4A]/10 text-[#1B2A4A]"
                        }`}
                      >
                        {step.number}
                      </span>
                      <h3 className="font-serif font-bold text-xs sm:text-sm text-[#111111]">
                        {step.title}
                      </h3>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-[#1B2A4A] transition-transform ${
                        isActive ? "rotate-90" : "opacity-40"
                      }`}
                    />
                  </div>

                  {isActive && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#1B2A4A]/10 animate-in fade-in duration-200">
                      <p className="text-xs text-[#6B7280] leading-relaxed">
                        {step.description}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{step.badge}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Preview Viewport */}
          <div className="lg:col-span-7 sticky top-28">
            <div className="rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-lg overflow-hidden">
              
              {/* Window Header */}
              <div className="px-4 py-2.5 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#1B2A4A]" />
                  <span className="font-mono font-semibold text-[#1B2A4A] text-[11px]">
                    STAGE_{steps[activeStep].number} // EXECUTION_VIEW
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#6B7280]">
                  TraceIQ Pipeline
                </span>
              </div>

              {/* Code Snippet Box */}
              <div className="p-4 bg-[#1B2A4A] text-slate-200 font-mono text-xs overflow-x-auto min-h-[170px]">
                <pre className="text-slate-300 leading-relaxed font-mono text-[11px]">
                  {steps[activeStep].codeSnippet}
                </pre>
              </div>

              {/* Live Output Banner */}
              <div className="p-3 bg-white border-t border-[#1B2A4A]/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-[11px] font-semibold text-[#111111]">
                    {steps[activeStep].outputPreview}
                  </span>
                </div>
                <button
                  onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B2A4A] hover:underline"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
