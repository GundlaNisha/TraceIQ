"use client";

import React from "react";
import { Cpu, Database, Server, GitBranch, Shield, Zap, Terminal, Code2 } from "lucide-react";

export function TechCredibilityStrip() {
  const techStack = [
    { name: "Next.js 16", desc: "React 19 Server Components", category: "Frontend" },
    { name: "FastAPI", desc: "Async Python 3.11 REST Gateway", category: "Backend" },
    { name: "LangGraph", desc: "Stateful AI Agent & HITL Gates", category: "Orchestration" },
    { name: "PostgreSQL & pgvector", desc: "384d Cosine & Hybrid RRF", category: "Database" },
    { name: "Tree-sitter", desc: "Multi-Language AST Grammars", category: "Parsing" },
    { name: "Multi-Provider AI", desc: "Gemini, Groq & OpenCode Failover", category: "LLMs" },
    { name: "Redis Cache & SSE", desc: "Distributed Locks & Pub/Sub", category: "Infrastructure" },
    { name: "GitHub & Jira OAuth", desc: "3LO Auto-Webhooks & CI Checks", category: "Integrations" },
  ];

  return (
    <section id="stack" className="py-16 bg-[#F8F6F2] border-y border-[#1B2A4A]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Lead */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="font-serif font-bold text-lg text-[#111111]">
              Built on battle-tested engineering infrastructure.
            </h3>
            <p className="text-xs text-[#6B7280]">
              Zero proprietary black-box locks. Standard relational schemas, native AST parsers, and open protocols.
            </p>
          </div>
          <div className="font-mono text-xs text-[#1B2A4A] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>OpenAPI 3.1 Spec // Port 8000</span>
          </div>
        </div>

        {/* Quiet Trust Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="p-3 rounded-lg bg-white border border-[#1B2A4A]/10 shadow-2xs hover:border-[#1B2A4A]/30 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-[9px] text-[#6B7280] uppercase tracking-wider">
                  {tech.category}
                </span>
                <div className="font-serif font-bold text-xs text-[#111111] mt-0.5">
                  {tech.name}
                </div>
              </div>
              <div className="text-[10px] font-mono text-[#6B7280] mt-2 leading-tight">
                {tech.desc}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
