"use client";

import React from "react";
import Link from "next/link";
import { Terminal, Shield, FileCode2, ExternalLink } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-[#16213E] text-[#F8F6F2] border-t border-white/10 pt-16 pb-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          
          {/* Col 1: Brand & Synopsis */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F8F6F2] text-[#1B2A4A] flex items-center justify-center font-serif font-bold text-base shadow-sm">
                TIQ
              </div>
              <span className="font-serif font-bold text-lg text-white">
                TraceIQ
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-white/10 text-emerald-400 border border-white/15">
                v0.1.0-beta
              </span>
            </div>
            
            <p className="text-slate-300 font-sans leading-relaxed max-w-sm">
              Enterprise developer platform combining Tree-sitter AST code graph traversal, sub-15ms hybrid RRF search, and automated GitHub PR code reviews.
            </p>

            <div className="font-mono text-[11px] text-slate-400">
              MIT License • Built with Next.js 16 &amp; FastAPI
            </div>
          </div>

          {/* Col 2: Core Platform */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider font-bold text-white">
              Platform
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <a href="#capabilities" className="hover:text-white transition-colors">
                  AST Code Indexing
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-white transition-colors">
                  2-Hop Blast Radius
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-white transition-colors">
                  Hybrid RRF Code Search
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-white transition-colors">
                  Automated PR Reviews
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-white transition-colors">
                  Traceability Matrix
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Architecture & API */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider font-bold text-white">
              Architecture &amp; Docs
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <a href="#architecture" className="hover:text-white transition-colors">
                  System Architecture
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>OpenAPI Swagger UI</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors">
                  Workflow Lifecycle
                </a>
              </li>
              <li>
                <a href="#stack" className="hover:text-white transition-colors">
                  Technology Stack
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Workspaces & Security */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider font-bold text-white">
              Security &amp; RBAC
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <span className="text-slate-300">Personal &amp; Team Workspaces</span>
              </li>
              <li>
                <span className="text-slate-300">Owner, Admin, Member, Viewer</span>
              </li>
              <li>
                <span className="text-slate-300">Tokenized Invite URLs (<code>/join/[token]</code>)</span>
              </li>
              <li>
                <span className="text-slate-300">Scoped Context (<code>X-Workspace-Id</code>)</span>
              </li>
              <li>
                <span className="text-slate-300">MIT Open Source License</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 font-sans">
          <div>
            &copy; {new Date().getFullYear()} TraceIQ. Autonomous Code Impact &amp; PR Review Intelligence.
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/sign-in" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">
              Public Beta Access
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
