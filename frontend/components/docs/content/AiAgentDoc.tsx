"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { AgentChatbotVisual } from "@/components/landing/AgentChatbotVisual";
import { MultiProviderVisual } from "../architecture/MultiProviderVisual";

export function AiAgentDoc() {
  return (
    <article className="space-y-12 max-w-5xl text-[15px] leading-relaxed text-[#222222]">
      {/* Title & Introduction */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-3">
          Documentation // Autonomous AI Agent
        </div>
        <h1 id="agent-overview" className="text-3xl sm:text-5xl font-serif font-bold text-[#111111] tracking-tight">
          Autonomous LangGraph AI Coding Agent
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#555E6D] leading-relaxed">
          TraceIQ embeds a persistent, codebase-aware coding agent built on LangGraph and Server-Sent Events (SSE). Unlike stateless chat wrappers, it resolves inline <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">@mentions</code> against your workspace entities, fetches live GitHub PR diffs, verifies requirements via 2-hop AST traversal, and enforces Human-in-the-Loop approval gates before drafting changes.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Interactive Chatbot & Graph Visual */}
      <section className="space-y-4">
        <h2 id="interactive-agent-visual" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111]">
          Interactive Agent Workspace &amp; Topology
        </h2>
        <p className="text-sm text-[#555E6D]">
          Explore how inline <code className="font-mono bg-slate-100 px-1 rounded text-xs">@repo</code>, <code className="font-mono bg-slate-100 px-1 rounded text-xs">@req</code>, and <code className="font-mono bg-slate-100 px-1 rounded text-xs">@pr</code> mentions route across TraceIQ&apos;s LangGraph nodes and checkpoint gates:
        </p>
        <AgentChatbotVisual />
      </section>

      {/* LangGraph State Machine */}
      <section className="space-y-4 pt-2">
        <h2 id="langgraph-workflow" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          LangGraph Nodes &amp; Human-in-the-Loop Gates
        </h2>
        <p>
          Defined in <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">backend/app/modules/agent/graphs/workflow.py</code>, the agent graph starts every message at the <code className="font-mono text-xs bg-slate-100 px-1">supervisor</code> router and selects an execution branch grounded strictly in real repository context:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-1.5">
            <h3 className="font-serif font-bold text-[#111111]">1. Code Explorer (code_explorer)</h3>
            <p className="text-xs text-[#555E6D]">
              Runs hybrid RRF search and AST symbol lookup to pinpoint exact starting files and functions. Skips empty or missing indexes instead of inventing paths.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-1.5">
            <h3 className="font-serif font-bold text-[#111111]">2. Verify Implementation (verify_implementation)</h3>
            <p className="text-xs text-[#555E6D]">
              Fetches live GitHub PR diffs via <code className="font-mono text-[11px]">pr_fetch.py</code>, checks Jira acceptance criteria, and flags missing edge cases or untested callers.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-1.5">
            <h3 className="font-serif font-bold text-[#111111]">3. Pre-Review &amp; Test Audit (pre_review)</h3>
            <p className="text-xs text-[#555E6D]">
              Audits missing unit tests across Python and TypeScript files while filtering non-code assets and comparing against existing PR review runs.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#1B2A4A]/15 space-y-1.5">
            <h3 className="font-serif font-bold text-[#111111]">4. HITL Gates &amp; PR Drafter</h3>
            <p className="text-xs text-[#555E6D]">
              Pauses cleanly at <code className="font-mono text-[11px]">hitl_starting_point</code> and <code className="font-mono text-[11px]">hitl_pre_review</code> until the user approves via <code className="font-mono text-[11px]">Command(resume=...)</code>.
            </p>
          </div>
        </div>

        <DocsCallout type="note" title="Auto Repository Indexing & Dynamic Session Titles">
          When a newly bound repository lacks an AST index, the agent automatically dispatches repository indexing, generates a concise session title via <code className="font-mono">title_generator.py</code>, and streams progress over Redis SSE.
        </DocsCallout>
      </section>

      {/* @Mentions & Live SSE Streaming */}
      <section className="space-y-4 pt-2">
        <h2 id="mentions-and-streaming" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Inline @Mentions &amp; Live SSE Streaming
        </h2>
        <p>
          Typing <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">@</code> in the agent composer triggers <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">AgentMentionMenu</code> to bind exact tenant entities (<code className="font-mono text-xs">@repo:owner/name</code>, <code className="font-mono text-xs">@req:KEY</code>, <code className="font-mono text-xs">@pr:#142</code>) rather than relying on ambiguous text queries.
        </p>

        <DocsCodeBlock
          language="bash"
          filename="Stream Agent Events & Submit HITL Approval"
          code={`# 1. Subscribe to live status tokens & approval interrupts
curl -N -H "Authorization: Bearer $CLERK_TOKEN" \\
  "http://localhost:8000/api/v1/agent/sessions/$SESSION_ID/stream"

# 2. Resume a paused LangGraph HITL checkpoint
curl -X POST "http://localhost:8000/api/v1/agent/sessions/$SESSION_ID/approvals/$APPROVAL_ID" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "approved", "user_feedback": "Proceed with PR draft"}'`}
        />
      </section>

      {/* Multi-Provider AI Router */}
      <section className="space-y-4 pt-2">
        <h2 id="multi-provider-router" className="text-2xl sm:text-3xl font-serif font-bold text-[#111111] pb-2 border-b border-[#1B2A4A]/10">
          Multi-Provider AI Router &amp; Automatic Failover
        </h2>
        <p>
          Implemented in <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">backend/app/ai/providers/multi_provider.py</code>, TraceIQ eliminates single-vendor API bottlenecks by rotating healthy providers round-robin across <strong>Google Gemini</strong>, <strong>Groq</strong>, and <strong>OpenCode Zen</strong> with automatic cooldown windows on rate limits or transient outages.
        </p>

        <MultiProviderVisual />

        <DocsCallout type="tip" title="Live Provider Telemetry Endpoint">
          Inspect live provider health, active model rotation, and cooldown counters anytime at <code className="font-mono">GET /api/v1/health/ai</code>.
        </DocsCallout>
      </section>
    </article>
  );
}
