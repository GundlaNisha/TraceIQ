"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="py-20 md:py-28 bg-[#1B2A4A] text-[#F8F6F2] relative overflow-hidden">
      {/* Background Grid & AST Motif */}
      <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/10 text-emerald-400 text-xs font-mono border border-white/15">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Public Beta — Get Started Free</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-5xl font-bold font-serif tracking-tight text-white leading-tight mb-4">
          Eliminate blind merges. <br />
          <span className="italic text-emerald-400">Index your code graph today.</span>
        </h2>

        {/* Subhead */}
        <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-8">
          Connect your GitHub repository in 60 seconds. Experience sub-15ms hybrid code search, 2-hop blast radius prediction, and autonomous PR reviews.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-white text-[#1B2A4A] font-serif font-bold text-sm shadow-lg hover:bg-slate-100 transition-all active:translate-y-px"
          >
            <span>Start Building for Free</span>
            <ArrowRight className="w-4 h-4 text-[#1B2A4A] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Micro Guarantee */}
        <div className="mt-8 pt-5 border-t border-white/10 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Tenant RBAC</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>0 MB RAM Embeddings</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>GitHub &amp; Jira Webhooks</span>
          </span>
        </div>

      </div>
    </section>
  );
}
