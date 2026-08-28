"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Terminal, CheckCircle2, ShieldCheck } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="py-24 md:py-32 bg-[#1B2A4A] text-[#F8F6F2] relative overflow-hidden">
      {/* Background Grid & AST Motif */}
      <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Condensed Geometric AST Node Motif */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none hidden lg:block">
        <svg width="240" height="240" viewBox="0 0 200 200" fill="none">
          <circle cx="40" cy="40" r="16" stroke="white" strokeWidth="2" />
          <circle cx="160" cy="50" r="16" stroke="white" strokeWidth="2" />
          <circle cx="100" cy="120" r="20" stroke="#10B981" strokeWidth="3" fill="#10B981" fillOpacity="0.2" />
          <circle cx="50" cy="170" r="14" stroke="white" strokeWidth="2" />
          <circle cx="150" cy="170" r="14" stroke="white" strokeWidth="2" />
          <path d="M52 52L85 105M148 62L115 105M100 140V156M85 135L60 160M115 135L140 160" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-white/10 text-emerald-400 text-xs font-mono border border-white/15">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Public Beta — Zero Credit Card Required</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-serif tracking-tight text-white leading-tight mb-6">
          Eliminate blind merges. <br />
          <span className="italic text-emerald-400">Index your code graph today.</span>
        </h2>

        {/* Subhead */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 font-sans leading-relaxed mb-10">
          Connect your GitHub repository in 60 seconds. Experience sub-15ms hybrid code search, automated 2-hop blast radius prediction, and autonomous PR reviews.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-white text-[#1B2A4A] font-serif font-bold text-base shadow-lg hover:bg-slate-100 transition-all active:translate-y-px"
          >
            <span>Start Building for Free</span>
            <ArrowRight className="w-4 h-4 text-[#1B2A4A] transition-transform group-hover:translate-x-1" />
          </Link>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/20 font-medium text-sm transition-all"
          >
            <span>Read API &amp; Architecture Docs</span>
          </a>
        </div>

        {/* Micro Guarantee */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Tenant RBAC</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>0 MB RAM Gemini Embeddings</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>GitHub App Webhooks</span>
          </span>
        </div>

      </div>
    </section>
  );
}
