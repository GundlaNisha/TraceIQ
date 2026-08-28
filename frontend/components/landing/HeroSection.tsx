"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Copy, Check, Terminal, Sparkles, Network, GitPullRequest } from "lucide-react";
import { HeroGraphVisual } from "./HeroGraphVisual";

export function HeroSection() {
  const [copied, setCopied] = useState(false);
  const commandText = "git push origin feature/auth-v2";

  const handleCopy = () => {
    navigator.clipboard.writeText(commandText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Subtle Background Glows & Noise */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] bg-[#1B2A4A]/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-[600px] h-[600px] bg-[#1B2A4A]/4 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Centered Status Pill */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#1B2A4A]/15 shadow-xs text-xs font-medium text-[#1B2A4A] backdrop-blur-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold">TraceIQ Engine 2.0</span>
            <span className="text-[#6B7280]">•</span>
            <span className="text-[#6B7280]">Autonomous AST Code Graph & PR Intelligence</span>
          </div>
        </div>

        {/* Hero Title & Value Proposition */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-serif text-[#111111] tracking-tight leading-[1.08] mb-6">
            Know the exact{" "}
            <span className="text-[#1B2A4A] italic underline decoration-[#1B2A4A]/20 underline-offset-8">
              blast radius
            </span>{" "}
            before you merge.
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#6B7280] font-sans leading-relaxed">
            TraceIQ bridges product requirements, codebase architecture, and pull requests. 
            By traversing multi-language AST code graphs with sub-15ms hybrid RRF search, 
            it computes 2-hop impact footprints and automates GitHub reviews with zero hallucinated context.
          </p>
        </div>

        {/* Dual Call to Action and Terminal Trigger */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 max-w-xl mx-auto">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#1B2A4A] text-[#F8F6F2] font-semibold text-sm shadow-md hover:bg-[#16213E] transition-all hover:shadow-lg active:translate-y-px"
          >
            <span>Start Building for Free</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <a
            href="#architecture"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white/90 hover:bg-white text-[#1B2A4A] border border-[#1B2A4A]/20 font-medium text-sm shadow-xs transition-all hover:border-[#1B2A4A]/40"
          >
            <span>Explore System Architecture</span>
          </a>
        </div>

        {/* Hero Visual Mockup Component */}
        <div className="max-w-5xl mx-auto">
          <HeroGraphVisual />
        </div>

        {/* Quick Engineering Trust Bar */}
        <div className="mt-12 pt-8 border-t border-[#1B2A4A]/10 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B2A4A]">&lt; 15 ms</span>
            <span className="text-xs text-[#6B7280] mt-0.5">Hybrid RRF Query Latency</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B2A4A]">2-Hop AST</span>
            <span className="text-xs text-[#6B7280] mt-0.5">Graph Traversal Depth</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B2A4A]">384-Dim</span>
            <span className="text-xs text-[#6B7280] mt-0.5">Gemini Dense Embeddings</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#1B2A4A]">100% Native</span>
            <span className="text-xs text-[#6B7280] mt-0.5">GitHub App & Webhooks</span>
          </div>
        </div>

      </div>
    </section>
  );
}
