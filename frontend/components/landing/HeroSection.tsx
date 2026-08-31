"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { HeroGraphVisual } from "./HeroGraphVisual";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-16 md:pt-38 md:pb-24 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-20 left-1/4 w-[450px] h-[450px] bg-[#1B2A4A]/5 rounded-full blur-3xl" />
        <div className="absolute top-32 right-1/4 w-[500px] h-[500px] bg-[#1B2A4A]/4 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Status Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#1B2A4A]/15 shadow-xs text-xs font-medium text-[#1B2A4A] backdrop-blur-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold">TraceIQ 2.0</span>
            <span className="text-[#6B7280]">•</span>
            <span className="text-[#6B7280]">Autonomous Code Impact &amp; PR Intelligence</span>
          </div>
        </div>

        {/* Hero Title & Concise Value Prop */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h1 className="text-4xl sm:text-6xl font-bold font-serif text-[#111111] tracking-tight leading-[1.1] mb-5">
            Know the exact{" "}
            <span className="text-[#1B2A4A] italic underline decoration-[#1B2A4A]/20 underline-offset-8">
              blast radius
            </span>{" "}
            before you merge.
          </h1>

          <p className="max-w-xl mx-auto text-base sm:text-lg text-[#6B7280] font-sans leading-relaxed">
            TraceIQ traverses your codebase&apos;s AST dependency graph to predict downstream breaking changes, automate PR reviews, and enforce continuous traceability.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14 max-w-md mx-auto">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-[#1B2A4A] text-[#F8F6F2] font-semibold text-sm shadow-md hover:bg-[#16213E] transition-all hover:shadow-lg active:translate-y-px"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <a
            href="#capabilities"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white hover:bg-slate-50 text-[#1B2A4A] border border-[#1B2A4A]/20 font-medium text-sm shadow-xs transition-all hover:border-[#1B2A4A]/40"
          >
            <span>View Capabilities</span>
          </a>
        </div>

        {/* Hero Graph Visual */}
        <div className="max-w-5xl mx-auto">
          <HeroGraphVisual />
        </div>

        {/* Quick Engineering Metric Strip */}
        <div className="mt-12 pt-8 border-t border-[#1B2A4A]/10 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B2A4A]">&lt; 15 ms</span>
            <span className="text-xs text-[#6B7280] mt-0.5">Hybrid RRF Latency</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B2A4A]">2-Hop AST</span>
            <span className="text-xs text-[#6B7280] mt-0.5">Graph Traversal Depth</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B2A4A]">384-Dim</span>
            <span className="text-xs text-[#6B7280] mt-0.5">Gemini Embeddings</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B2A4A]">100% Native</span>
            <span className="text-xs text-[#6B7280] mt-0.5">GitHub &amp; Jira Webhooks</span>
          </div>
        </div>

      </div>
    </section>
  );
}
