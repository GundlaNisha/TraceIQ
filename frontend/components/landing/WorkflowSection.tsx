"use client";

import React, { useState } from "react";
import { 
  GitBranch, 
  Database, 
  FileEdit, 
  Search, 
  GitPullRequest, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  ChevronRight,
  Terminal,
  ShieldCheck,
  TableProperties
} from "lucide-react";

export function WorkflowSection() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      id: "step-1",
      number: "01",
      title: "Connect Repository via GitHub App",
      badge: "1-Click Handshake",
      description:
        "Install the TraceIQ GitHub App or connect via API token. Choose target workspace and select public or private repositories for continuous indexing.",
      codeSnippet: `# CLI / API equivalent
POST /api/v1/repositories
{
  "repo_name": "enterprise/core-auth",
  "workspace_id": "ws_prod_01",
  "auto_review_enabled": true
}`,
      outputPreview: "Connected: enterprise/core-auth (Webhook Active)",
    },
    {
      id: "step-2",
      number: "02",
      title: "High-Throughput AST Indexing",
      badge: "Tree-sitter Grammars",
      description:
        "TraceIQ parses multi-language syntax trees, extracts symbols and call graphs, and generates dense 384d Gemini embeddings in bulk transactions.",
      codeSnippet: `// Tree-sitter AST Chunker
[1/140] Parsed app/modules/auth/guard.py (3 symbols)
[2/140] Parsed app/db/session.py (2 symbols)
--> Ingested 420 code vectors into pgvector in 1.4s`,
      outputPreview: "Index Status: 100% Synced (0 MB Server Overhead)",
    },
    {
      id: "step-3",
      number: "03",
      title: "Define Requirement & Compute Blast Radius",
      badge: "2-Hop Traversal",
      description:
        "Draft product acceptance criteria in TraceIQ. The engine traverses 2 hops in the AST dependency graph to predict impacted files and missing test suites.",
      codeSnippet: `POST /api/v1/requirements/84/analyze
Response:
{
  "risk_score": "HIGH",
  "impacted_files": ["guard.py", "session.py", "meter.py"],
  "confidence": 0.968
}`,
      outputPreview: "Blast Radius: 6 Downstream Callers Flagged",
    },
    {
      id: "step-4",
      number: "04",
      title: "Developer Pushes Code to GitHub",
      badge: "Event Ingress",
      description:
        "Engineers work normally in their IDE and push commits. GitHub emits a webhook event to TraceIQ's Celery queue for async review dispatch.",
      codeSnippet: `$ git add . && git commit -m "feat(auth): token rotation"
$ git push origin feature/auth-v2
--> Webhook received: pull_request.opened (PR #142)`,
      outputPreview: "Celery Task Dispatched: review_pr_job_772",
    },
    {
      id: "step-5",
      number: "05",
      title: "Automated Review Posted to GitHub",
      badge: "Zero-Hallucination",
      description:
        "TraceIQ compares patch chunks against the requirement blast radius, posting structured review comments, severity summaries, and suggestions inline.",
      codeSnippet: `traceiq-bot commented on PR #142:
"⚠️ Requirement Gap: Missing session invalidation
for expired refresh tokens in tests/test_auth.py"`,
      outputPreview: "GitHub Review Status: Commented (1 Gap Found)",
    },
    {
      id: "step-6",
      number: "06",
      title: "Traceability Matrix Auto-Updates",
      badge: "Realtime Audit",
      description:
        "The compliance health score updates in real-time. Requirements, blast radius predictions, and PR review verdicts form an unbroken audit trail.",
      codeSnippet: `GET /api/v1/traceability
{
  "repository": "enterprise/core-auth",
  "compliance_health_score": 96.4,
  "verified_requirements": 18
}`,
      outputPreview: "Compliance Health: 96.4% (Audit Ready)",
    },
  ];

  return (
    <section id="workflow" className="py-24 md:py-32 bg-[#F8F6F2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A] text-xs font-mono tracking-wider uppercase mb-4 border border-[#1B2A4A]/15">
            <span>Lifecycle Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-serif tracking-tight text-[#111111] leading-tight">
            From requirement to merge <br />
            <span className="text-[#1B2A4A]">in six automated stages.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#6B7280] font-sans leading-relaxed">
            TraceIQ slots seamlessly into your existing Git workflow, giving your team superhuman visibility without changing how developers write code.
          </p>
        </div>

        {/* Interactive Step Sequence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Step Selection List (Left 5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? "bg-white border-[#1B2A4A] shadow-md scale-[1.01]"
                      : "bg-white/60 border-[#1B2A4A]/10 hover:bg-white hover:border-[#1B2A4A]/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          isActive
                            ? "bg-[#1B2A4A] text-white"
                            : "bg-[#1B2A4A]/10 text-[#1B2A4A]"
                        }`}
                      >
                        {step.number}
                      </span>
                      <h3 className="font-serif font-bold text-sm sm:text-base text-[#111111]">
                        {step.title}
                      </h3>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-[#1B2A4A] transition-transform ${
                        isActive ? "rotate-90" : "opacity-40"
                      }`}
                    />
                  </div>

                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-[#1B2A4A]/10 animate-in fade-in duration-200">
                      <p className="text-xs text-[#6B7280] leading-relaxed">
                        {step.description}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{step.badge}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Preview Viewport (Right 7 Cols) */}
          <div className="lg:col-span-7 sticky top-28">
            <div className="rounded-2xl bg-white border border-[#1B2A4A]/15 shadow-xl overflow-hidden">
              
              {/* Window Header */}
              <div className="px-4 py-3 bg-[#F8F6F2] border-b border-[#1B2A4A]/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#1B2A4A]" />
                  <span className="font-mono font-semibold text-[#1B2A4A]">
                    STAGE_{steps[activeStep].number} // EXECUTION_VIEW
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#6B7280]">
                  TraceIQ Pipeline
                </span>
              </div>

              {/* Code Snippet Box */}
              <div className="p-5 bg-[#1B2A4A] text-slate-200 font-mono text-xs overflow-x-auto min-h-[200px]">
                <pre className="text-slate-300 leading-relaxed font-mono">
                  {steps[activeStep].codeSnippet}
                </pre>
              </div>

              {/* Live Output Banner */}
              <div className="p-4 bg-white border-t border-[#1B2A4A]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs font-semibold text-[#111111]">
                    {steps[activeStep].outputPreview}
                  </span>
                </div>
                <button
                  onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B2A4A] hover:underline"
                >
                  <span>Next Stage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
