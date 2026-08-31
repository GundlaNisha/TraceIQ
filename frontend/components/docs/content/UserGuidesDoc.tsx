"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Users, FolderGit2, FileText, Zap, GitPullRequest, ShieldCheck } from "lucide-react";

export function UserGuidesDoc() {
  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // User Guides
        </div>
        <h1 id="user-guides" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          User Guides &amp; Practical Workflows
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          Step-by-step instructions for team leads and developers on managing workspaces, connecting repositories, defining requirements, and auditing PR reviews.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Guide 1: Workspaces & Teams */}
      <section className="space-y-4">
        <h2 id="managing-workspaces" className="text-xl sm:text-2xl font-serif font-bold text-[#111111] flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <span>1. Creating &amp; Managing Team Workspaces</span>
        </h2>
        <p>
          TraceIQ provides every user with a private Personal Workspace and allows team leads to create shared Team Workspaces:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#111111]">
          <li>Click the Workspace Switcher in the top-left sidebar and select <strong>&quot;Create Workspace&quot;</strong>.</li>
          <li>Enter your team name (e.g. <code>Core Infrastructure</code>).</li>
          <li>In <strong>Workspace Settings &rarr; Members</strong>, click <strong>&quot;Generate Invite Link&quot;</strong>.</li>
          <li>Choose an expiration window (24h, 7d, or 30d) and copy the secure token link (e.g. <code>/join/inv_8f7a2...</code>).</li>
          <li>Teammates visiting the link will be automatically onboarded into the workspace.</li>
        </ol>
      </section>

      {/* Guide 2: Connecting Repositories */}
      <section className="space-y-4 pt-4">
        <h2 id="connecting-repositories" className="text-xl sm:text-2xl font-serif font-bold text-[#111111] flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-accent" />
          <span>2. Connecting &amp; Indexing Repositories</span>
        </h2>
        <p>
          Repositories can be connected through GitHub or direct clone URLs:
        </p>
        <ul className="space-y-1.5 text-xs text-[#111111]">
          <li>• Navigate to <strong>Repositories</strong> &rarr; <strong>Connect Repository</strong>.</li>
          <li>• Select your repository from GitHub or provide a custom Git clone URL.</li>
          <li>• Once connected, TraceIQ&apos;s background workers immediately clone and parse the repository AST, indexing functions and symbols in seconds.</li>
          <li>• Toggle <strong>Automated PR Reviews</strong> on or off in Repository Settings.</li>
        </ul>
      </section>

      {/* Guide 3: Requirements & Blast Radius */}
      <section className="space-y-4 pt-4">
        <h2 id="requirements-and-analysis" className="text-xl sm:text-2xl font-serif font-bold text-[#111111] flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          <span>3. Drafting Requirements &amp; Running Blast Radius</span>
        </h2>
        <p>
          Before writing code, analyze your product requirement:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#111111]">
          <li>Navigate to <strong>Requirements</strong> &rarr; <strong>New Requirement</strong> (or click <strong>Import from Jira</strong>).</li>
          <li>Enter your requirement title and acceptance criteria in plain Markdown.</li>
          <li>Click <strong>&quot;Analyze Blast Radius&quot;</strong> in the requirements table.</li>
          <li>Review the <strong>Impact Summary</strong>: predicted risk level, impacted files (seed, 1-hop, 2-hop), and missing test file checklist.</li>
        </ol>
      </section>

      {/* Guide 4: PR Reviews */}
      <section className="space-y-4 pt-4">
        <h2 id="pull-request-reviews" className="text-xl sm:text-2xl font-serif font-bold text-[#111111] flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-accent" />
          <span>4. Pull Request Review &amp; Diff Inspection</span>
        </h2>
        <p>
          When pull requests are opened on GitHub:
        </p>
        <ul className="space-y-1.5 text-xs text-[#111111]">
          <li>• TraceIQ automatically conducts a multi-pass code review against active product requirements.</li>
          <li>• Open <strong>PR Reviews</strong> in TraceIQ to view side-by-side diff chunks, severity badges, and identified requirement gaps.</li>
          <li>• Click <strong>&quot;Rerun Review&quot;</strong> on demand to re-evaluate after pushing new commits.</li>
        </ul>
      </section>

      {/* Guide 5: Traceability */}
      <section className="space-y-4 pt-4">
        <h2 id="traceability-matrix" className="text-xl sm:text-2xl font-serif font-bold text-[#111111] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          <span>5. Traceability Matrix &amp; Compliance Audit</span>
        </h2>
        <p>
          Navigate to <strong>Traceability</strong> to view repository compliance scores. Each requirement displays its linked blast radius prediction, the associated GitHub PRs, and verification status.
        </p>
      </section>

    </article>
  );
}
