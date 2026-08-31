"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { GitPullRequest, Code2, CheckCircle2, Terminal } from "lucide-react";

export function ContributingDoc() {
  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // Contributing
        </div>
        <h1 id="contributing-guide" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          Contributing &amp; Development Guidelines
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          We welcome open-source contributions to TraceIQ! Follow this guide to set up your development environment, run test suites, format code, and submit PRs.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Development Workflow */}
      <section className="space-y-4">
        <h2 id="dev-workflow" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Local Development Workflow
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-xs text-[#111111]">
          <li>Fork the <a href="https://github.com/GundlaNisha/TraceIQ" target="_blank" rel="noreferrer" className="underline font-semibold text-accent">TraceIQ repository</a> on GitHub.</li>
          <li>Create a feature branch with a descriptive name (<code className="font-mono bg-slate-100 px-1">git checkout -b feat/custom-parser</code>).</li>
          <li>Install dependencies and verify test suite passes locally.</li>
          <li>Implement your changes with matching unit tests.</li>
          <li>Format code using <strong>Ruff</strong> (backend) and <strong>Prettier/ESLint</strong> (frontend).</li>
          <li>Submit a Pull Request with a clear summary of your changes.</li>
        </ol>
      </section>

      {/* Running Tests */}
      <section className="space-y-4 pt-4">
        <h2 id="running-tests" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Running Test Suites
        </h2>

        <h4 className="font-serif font-bold text-sm text-[#111111]">Backend Pytest Suite</h4>
        <DocsCodeBlock
          code={`cd backend
# Run all tests
uv run pytest

# Run Jira and indexing tests specifically
uv run pytest tests/jira/ tests/indexing/`}
          language="bash"
          filename="Backend Testing"
        />

        <h4 className="font-serif font-bold text-sm text-[#111111] mt-4">Frontend Vitest Suite</h4>
        <DocsCodeBlock
          code={`cd frontend
# Run vitest unit tests
npm test

# Run full TypeScript type-check and production build
npm run build`}
          language="bash"
          filename="Frontend Testing"
        />
      </section>

      {/* Code Formatting */}
      <section className="space-y-4 pt-4">
        <h2 id="code-style" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Code Formatting &amp; Quality Standards
        </h2>
        <p>
          TraceIQ enforces strict formatting standards. Run the following checks before committing:
        </p>

        <DocsCodeBlock
          code={`# Backend linting & auto-formatting
cd backend
uv run ruff check . --fix
uv run ruff format .

# Frontend linting
cd frontend
npm run lint`}
          language="bash"
          filename="Code Quality Commands"
        />

        <DocsCallout type="note" title="Commit Message Conventions">
          TraceIQ adheres to Conventional Commits:
          <ul className="list-disc pl-4 mt-1 space-y-0.5 font-mono text-[11px]">
            <li><code>feat(jira): add kanban board issue filters</code></li>
            <li><code>fix(retrieval): correct cosine distance threshold</code></li>
            <li><code>docs(architecture): add 4-tier system diagram</code></li>
          </ul>
        </DocsCallout>
      </section>

    </article>
  );
}
