"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { AgentChatbotVisual } from "./AgentChatbotVisual";

export function AgentShowcaseSection() {
  return (
    <section id="agent" className="py-20 md:py-28 bg-[#F8F6F2] border-t border-[#1B2A4A]/10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A] text-xs font-mono tracking-wider uppercase mb-3 border border-[#1B2A4A]/15">
              <Bot className="w-3.5 h-3.5 text-emerald-700" />
              <span>Interactive AI Agent</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight text-[#111111] leading-tight text-balance">
              Converse with your code graph{" "}
              <span className="text-[#1B2A4A]">before writing a single line.</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#6B7280] font-sans leading-relaxed text-pretty">
              Tag repositories, Jira requirements, or live GitHub pull requests inline with @mentions. TraceIQ dispatches a LangGraph agent with AST search tools, SSE live streaming, and human approval checkpoints.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/docs?section=ai-agent"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1B2A4A] border border-[#1B2A4A]/20 font-medium text-xs shadow-2xs transition-colors"
            >
              <span>Read Agent Architecture Docs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Custom Illustrated Chatbot + LangGraph Topology Visual */}
        <AgentChatbotVisual />
      </div>
    </section>
  );
}
