"use client";

import React, { useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Terminal,
  GitPullRequest,
  FileCode2,
  AtSign,
  Radio,
  Check,
  X,
  Cpu,
} from "lucide-react";

type ScenarioId = "verify" | "mention" | "hitl";

interface Scenario {
  id: ScenarioId;
  label: string;
  badge: string;
  activeNode: "verify_implementation" | "code_explorer" | "hitl_pre_review" | "pr_drafter";
  userPrompt: React.ReactNode;
  tools: { name: string; latency: string }[];
  responseTitle: string;
  summary: string;
  codeFile: string;
  codeLines: string[];
  approvalRequired?: boolean;
}

const SCENARIOS: Record<ScenarioId, Scenario> = {
  verify: {
    id: "verify",
    label: "Verify Implementation",
    badge: "2-Hop AST Audit",
    activeNode: "verify_implementation",
    userPrompt: (
      <>
        Verify{" "}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-400/30">
          @req:SAM1-4
        </span>{" "}
        against{" "}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[11px] border border-sky-400/30">
          @pr:#142
        </span>{" "}
        and check 2-hop callers.
      </>
    ),
    tools: [
      { name: "fetch_github_pr_diff(#142)", latency: "48ms" },
      { name: "search_codebase_rrf(k=60)", latency: "11ms" },
      { name: "trace_2hop_callers(guard.py)", latency: "19ms" },
    ],
    responseTitle: "Implementation Verification: 1 Transitive Gap",
    summary:
      "Refresh token rotation updates users.session_version, while 2-hop caller AuthMiddleware.dispatch still reads cached Redis session TTLs.",
    codeFile: "backend/app/modules/auth/guard.py",
    codeLines: [
      "+ await session_store.revoke_all(user_id)",
      "! missing: cache.invalidate_user(user_id) # 2-hop caller impact",
    ],
  },
  mention: {
    id: "mention",
    label: "@Mention Scoping",
    badge: "Live Autocomplete",
    activeNode: "code_explorer",
    userPrompt: (
      <>
        Trace webhook signature verification in{" "}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] border border-amber-400/30">
          @repo:enterprise/core
        </span>
      </>
    ),
    tools: [
      { name: "resolve_tagged_repo(enterprise/core)", latency: "6ms" },
      { name: "ast_symbol_lookup(verify_jira_webhook)", latency: "9ms" },
    ],
    responseTitle: "Starting Points Resolved (3 AST Symbols)",
    summary:
      "Webhook signatures validate HMAC-SHA256 digests with constant-time comparison before resolving the scoped tenant row.",
    codeFile: "backend/app/modules/jira/routes/jira.py",
    codeLines: [
      "verify_jira_webhook_signature(body, sig_header, secret)",
      "return await handle_jira_webhook(db, payload, secret)",
    ],
  },
  hitl: {
    id: "hitl",
    label: "HITL Approval Gate",
    badge: "Human-in-the-Loop",
    activeNode: "hitl_pre_review",
    userPrompt: (
      <>
        Audit test coverage gaps in{" "}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] border border-amber-400/30">
          @repo:TraceIQ/backend
        </span>{" "}
        and prepare a PR draft.
      </>
    ),
    tools: [
      { name: "audit_missing_tests(python, ts)", latency: "22ms" },
      { name: "check_existing_pr_reviews()", latency: "8ms" },
    ],
    responseTitle: "Pre-Review Audit Complete — Checkpoint Paused",
    summary:
      "Found 2 missing edge-case tests for OAuth refresh token lock contention. LangGraph checkpoint paused cleanly awaiting confirmation before drafting.",
    codeFile: "backend/tests/jira/test_jira_oauth.py",
    codeLines: [
      "def test_rotating_refresh_token_single_flight_concurrency():",
      "    # Verifies Redis NX lock prevents duplicate Atlassian rotation",
    ],
    approvalRequired: true,
  },
};

export function AgentChatbotVisual() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("verify");
  const [approvalState, setApprovalState] = useState<"pending" | "approved" | "rejected">("pending");
  const scenario = SCENARIOS[scenarioId];

  const handleSelectScenario = (id: ScenarioId) => {
    setScenarioId(id);
    setApprovalState("pending");
  };

  const activeGraphNode =
    scenarioId === "hitl" && approvalState === "approved"
      ? "pr_drafter"
      : scenario.activeNode;

  return (
    <div className="rounded-3xl bg-[#0D1526] text-[#F8F6F2] border border-[#1B2A4A]/20 shadow-2xl overflow-hidden">
      {/* Top Browser / App Frame Header */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#09101F] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">TraceIQ AI Coding Agent</span>
            <span className="hidden sm:inline text-slate-500">//</span>
            <span className="hidden sm:inline text-emerald-400 flex items-center gap-1">
              LangGraph Stateful Orchestrator
            </span>
          </div>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
          {(Object.keys(SCENARIOS) as ScenarioId[]).map((key) => {
            const item = SCENARIOS[key];
            const isSelected = scenarioId === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectScenario(key)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                  isSelected
                    ? "bg-emerald-500 text-[#09101F] font-bold shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Body: Left Illustrated Chat Workspace, Right SVG LangGraph State Machine */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT COLUMN: Custom Illustrated Chatbot Workspace (Span 7) */}
        <div className="lg:col-span-7 p-4 sm:p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0D1526]">
          {/* Session Meta Bar */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-3 border-b border-white/10">
            <span className="flex items-center gap-2 text-slate-200 font-semibold truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              Session: Core Auth Token Rotation
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
              {scenario.badge}
            </span>
          </div>

          {/* User Prompt Bubble with @Mentions */}
          <div className="flex justify-end">
            <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-[#1B2A4A] border border-white/15 px-4 py-3 text-xs sm:text-sm text-white leading-relaxed shadow-sm">
              {scenario.userPrompt}
            </div>
          </div>

          {/* Live Tool Execution Stream */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                <Radio className="w-3 h-3 animate-pulse" />
                SSE Tool Invocation Stream
              </span>
              <span>MultiProviderRouter: Gemini ↗ Groq</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scenario.tools.map((tool) => (
                <span
                  key={tool.name}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#09101F] border border-white/10 font-mono text-[10px] text-slate-200"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{tool.name}</span>
                  <span className="text-emerald-400">{tool.latency}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Agent Structured Markdown & Artifact Response */}
          <div className="rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/15 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-serif font-bold text-sm text-white">
                  {scenario.responseTitle}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Grounded AST Context
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {scenario.summary}
            </p>

            {/* Syntax Highlighted Diff / Code Card */}
            <div className="rounded-xl bg-[#09101F] border border-white/10 overflow-hidden">
              <div className="px-3 py-1.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <FileCode2 className="w-3 h-3 text-sky-400" />
                  {scenario.codeFile}
                </span>
                <span>Unified Snippet</span>
              </div>
              <div className="p-3 font-mono text-[11px] space-y-1 overflow-x-auto">
                {scenario.codeLines.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("+")
                        ? "text-emerald-300"
                        : line.startsWith("!")
                          ? "text-amber-300"
                          : "text-slate-300"
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive HITL Approval Gate (visible in HITL scenario) */}
            {scenario.approvalRequired && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {approvalState === "pending" && "Human Approval Gate: Generate PR Draft?"}
                      {approvalState === "approved" && "Checkpoint Approved — PR Draft Generated"}
                      {approvalState === "rejected" && "Checkpoint Halted by Reviewer"}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {approvalState === "pending" &&
                        "LangGraph pauses execution until an engineer confirms."}
                      {approvalState === "approved" &&
                        "Resumed graph via Command(resume='approved') and created PRDraftCard."}
                      {approvalState === "rejected" &&
                        "Execution stopped cleanly without mutating repository drafts."}
                    </div>
                  </div>
                </div>
                {approvalState === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setApprovalState("approved")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#09101F] font-mono text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalState("rejected")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-mono text-[11px] transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      Hold
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Illustrated Input Bar + @Mention Autocomplete Strip */}
          <div className="pt-1 space-y-2">
            {scenarioId === "mention" && (
              <div className="rounded-xl bg-[#09101F] border border-emerald-500/30 p-2.5 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300 uppercase px-1">
                  <span className="flex items-center gap-1">
                    <AtSign className="w-3 h-3" /> Context Autocomplete
                  </span>
                  <span>Live DB Entities</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 font-mono text-[10px]">
                  <div className="px-2 py-1.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 truncate">
                    @repo:enterprise/core
                  </div>
                  <div className="px-2 py-1.5 rounded bg-white/[0.04] border border-white/10 text-slate-300 truncate">
                    @req:SAM1-4 Token Sync
                  </div>
                  <div className="px-2 py-1.5 rounded bg-white/[0.04] border border-white/10 text-slate-300 truncate">
                    @pr:#142 feat/auth-v2
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#09101F] border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-sans truncate">
                Ask about architecture, @repo, @req, or paste a PR diff...
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1B2A4A] text-white font-mono text-[10px] font-semibold shrink-0 border border-white/10">
                <span>Send</span>
                <Send className="w-3 h-3 text-emerald-400" />
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Custom SVG LangGraph State Machine & Multi-Provider Failover (Span 5) */}
        <div className="lg:col-span-5 p-4 sm:p-6 bg-[#09101F] flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                LangGraph Orchestration Topology
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Live State
              </span>
            </div>

            {/* Custom Illustrated SVG State Diagram */}
            <svg
              viewBox="0 0 380 280"
              className="w-full h-auto rounded-2xl bg-[#0D1526] border border-white/10 p-2"
              role="img"
              aria-label="TraceIQ LangGraph state machine connecting Supervisor, Code Explorer, Verify Implementation, Pre-Review, HITL Gate, and PR Drafter"
            >
              <defs>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#34D399" />
                </marker>
                <marker
                  id="arrow-muted"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
              </defs>

              {/* Edges */}
              <path
                d="M 190 52 L 85 96"
                stroke={activeGraphNode === "code_explorer" ? "#34D399" : "#334155"}
                strokeWidth="2"
                fill="none"
                markerEnd={activeGraphNode === "code_explorer" ? "url(#arrow-active)" : "url(#arrow-muted)"}
              />
              <path
                d="M 190 52 L 190 96"
                stroke={activeGraphNode === "verify_implementation" ? "#34D399" : "#334155"}
                strokeWidth="2"
                fill="none"
                markerEnd={activeGraphNode === "verify_implementation" ? "url(#arrow-active)" : "url(#arrow-muted)"}
              />
              <path
                d="M 190 52 L 295 96"
                stroke={
                  activeGraphNode === "hitl_pre_review" || activeGraphNode === "pr_drafter"
                    ? "#34D399"
                    : "#334155"
                }
                strokeWidth="2"
                fill="none"
                markerEnd={
                  activeGraphNode === "hitl_pre_review" || activeGraphNode === "pr_drafter"
                    ? "url(#arrow-active)"
                    : "url(#arrow-muted)"
                }
              />
              <path
                d="M 295 138 L 235 178"
                stroke={
                  activeGraphNode === "hitl_pre_review" || activeGraphNode === "pr_drafter"
                    ? "#FBBF24"
                    : "#334155"
                }
                strokeWidth="2"
                strokeDasharray="4 3"
                fill="none"
                markerEnd="url(#arrow-muted)"
              />
              <path
                d="M 85 138 L 145 178"
                stroke="#334155"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-muted)"
              />
              <path
                d="M 190 218 L 190 236"
                stroke={activeGraphNode === "pr_drafter" ? "#34D399" : "#334155"}
                strokeWidth="2"
                fill="none"
                markerEnd={activeGraphNode === "pr_drafter" ? "url(#arrow-active)" : "url(#arrow-muted)"}
              />

              {/* Supervisor Node */}
              <g transform="translate(115, 14)">
                <rect width="150" height="38" rx="10" fill="#1B2A4A" stroke="#38BDF8" strokeWidth="1.5" />
                <text x="75" y="18" textAnchor="middle" fill="#F8FAFC" fontSize="11" fontWeight="700" fontFamily="monospace">
                  Supervisor Router
                </text>
                <text x="75" y="31" textAnchor="middle" fill="#7DD3FC" fontSize="9" fontFamily="monospace">
                  Intent + @Mention Resolve
                </text>
              </g>

              {/* Code Explorer Node */}
              <g transform="translate(20, 98)">
                <rect
                  width="115"
                  height="40"
                  rx="9"
                  fill={activeGraphNode === "code_explorer" ? "#064E3B" : "#111C33"}
                  stroke={activeGraphNode === "code_explorer" ? "#34D399" : "#334155"}
                  strokeWidth="1.5"
                />
                <text x="57.5" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="monospace">
                  Code Explorer
                </text>
                <text x="57.5" y="32" textAnchor="middle" fill="#94A3B8" fontSize="8.5" fontFamily="monospace">
                  Hybrid RRF Search
                </text>
              </g>

              {/* Verify Implementation Node */}
              <g transform="translate(142, 98)">
                <rect
                  width="102"
                  height="40"
                  rx="9"
                  fill={activeGraphNode === "verify_implementation" ? "#064E3B" : "#111C33"}
                  stroke={activeGraphNode === "verify_implementation" ? "#34D399" : "#334155"}
                  strokeWidth="1.5"
                />
                <text x="51" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="monospace">
                  Verify Impl
                </text>
                <text x="51" y="32" textAnchor="middle" fill="#94A3B8" fontSize="8.5" fontFamily="monospace">
                  Live GitHub PR Diff
                </text>
              </g>

              {/* Pre-Review Node */}
              <g transform="translate(252, 98)">
                <rect
                  width="108"
                  height="40"
                  rx="9"
                  fill="#111C33"
                  stroke={activeGraphNode === "hitl_pre_review" ? "#FBBF24" : "#334155"}
                  strokeWidth="1.5"
                />
                <text x="54" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="monospace">
                  Pre-Review
                </text>
                <text x="54" y="32" textAnchor="middle" fill="#94A3B8" fontSize="8.5" fontFamily="monospace">
                  Test Gap Audit
                </text>
              </g>

              {/* HITL Checkpoint Node */}
              <g transform="translate(115, 178)">
                <rect
                  width="150"
                  height="40"
                  rx="9"
                  fill={activeGraphNode === "hitl_pre_review" ? "#451A03" : "#111C33"}
                  stroke={activeGraphNode === "hitl_pre_review" ? "#FBBF24" : "#475569"}
                  strokeWidth="1.5"
                />
                <text x="75" y="19" textAnchor="middle" fill="#FDE68A" fontSize="10" fontWeight="700" fontFamily="monospace">
                  HITL Approval Gate
                </text>
                <text x="75" y="32" textAnchor="middle" fill="#CBD5E1" fontSize="8.5" fontFamily="monospace">
                  Pause / Resume Checkpoint
                </text>
              </g>

              {/* PR Drafter Node */}
              <g transform="translate(115, 236)">
                <rect
                  width="150"
                  height="34"
                  rx="9"
                  fill={activeGraphNode === "pr_drafter" ? "#064E3B" : "#111C33"}
                  stroke={activeGraphNode === "pr_drafter" ? "#34D399" : "#334155"}
                  strokeWidth="1.5"
                />
                <text x="75" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="monospace">
                  PR Drafter &amp; Export
                </text>
              </g>
            </svg>
          </div>

          {/* Multi-Provider Failover Pool Status */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span>Multi-Provider Failover Pool</span>
              <span className="text-emerald-400 font-semibold">/api/v1/health/ai</span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                <div className="text-emerald-300 font-bold">Gemini</div>
                <div className="text-slate-300 mt-0.5">Primary Active</div>
              </div>
              <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
                <div className="text-sky-300 font-bold">Groq</div>
                <div className="text-slate-300 mt-0.5">Round-Robin</div>
              </div>
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25">
                <div className="text-indigo-300 font-bold">OpenCode</div>
                <div className="text-slate-300 mt-0.5">Instant Failover</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
