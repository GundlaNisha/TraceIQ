"use client";

import React from "react";
import { DocsCodeBlock } from "../DocsCodeBlock";
import { DocsCallout } from "../DocsCallout";
import { Terminal, Lock, Globe } from "lucide-react";

export function ApiReferenceDoc() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/dashboard/summary",
      desc: "Retrieve aggregated statistics and recent activity stream scoped by workspace.",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/workspaces",
      desc: "List accessible Personal and Team Workspaces for the current user.",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/workspaces",
      desc: "Create a new Team Workspace with the current user as Owner.",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/workspaces/{id}/invites",
      desc: "Generate a secure expiring tokenized invite link for team member onboarding.",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/repositories",
      desc: "List all connected repositories (supports ?all=true or scoped by X-Workspace-Id).",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/repositories",
      desc: "Connect a repository and trigger background AST indexing.",
      auth: true,
    },
    {
      method: "PATCH",
      path: "/api/v1/repositories/{id}/settings",
      desc: "Update automated review settings or transfer repository between workspaces.",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/requirements",
      desc: "List all product requirements with version numbers and Jira links.",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/requirements",
      desc: "Create a new requirement with Markdown text and optional Jira metadata.",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/requirements/{id}/analyze",
      desc: "Trigger asynchronous 2-hop graph blast radius analysis job.",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/jira/config",
      desc: "Get current Jira integration status (masked token preview).",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/jira/config",
      desc: "Verify credentials with Jira and save workspace connection.",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/jira/boards",
      desc: "List Kanban and Scrum boards from connected Jira instance.",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/jira/issues",
      desc: "Search Jira issues by keyword, project, board ID, sprint, or status category.",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/jira/import",
      desc: "Import a single Jira issue as a requirement with ADF conversion.",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/jira/import-batch",
      desc: "Batch import multiple Jira issues into a repository.",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/jira/requirements/{id}/sync",
      desc: "Re-sync requirement with latest upstream Jira issue changes.",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/search/code",
      desc: "Execute sub-15ms hybrid RRF search (pgvector + tsvector + symbols).",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/pr-reviews",
      desc: "List AI PR reviews and severity verdicts.",
      auth: true,
    },
    {
      method: "POST",
      path: "/api/v1/pr-reviews/{id}/rerun",
      desc: "Re-evaluate pull request against custom requirement criteria.",
      auth: true,
    },
    {
      method: "GET",
      path: "/api/v1/traceability",
      desc: "Fetch continuous traceability matrix and compliance health score.",
      auth: true,
    },
  ];

  return (
    <article className="space-y-8 max-w-4xl text-sm leading-relaxed text-[#111111]">
      
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-mono text-[11px] font-bold uppercase tracking-wider mb-2">
          Documentation // Reference
        </div>
        <h1 id="api-reference" className="text-3xl sm:text-4xl font-serif font-bold text-[#111111] tracking-tight">
          REST API Reference
        </h1>
        <p className="mt-3 text-base text-[#6B7280] leading-relaxed">
          Complete specification for the FastAPI REST gateway endpoints, headers, authentication, and payload formats.
        </p>
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Authentication Headers */}
      <section className="space-y-4">
        <h2 id="authentication-headers" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Authentication &amp; Workspace Headers
        </h2>
        <p>
          All protected endpoints require a Clerk JWT in the <code className="font-mono bg-slate-100 px-1">Authorization</code> header. Team Workspace operations are scoped using the <code className="font-mono bg-slate-100 px-1">X-Workspace-Id</code> header:
        </p>

        <DocsCodeBlock
          code={`# Standard Request Headers:
Authorization: Bearer <clerk_session_jwt>
X-Workspace-Id: <workspace_uuid>  # Optional: defaults to Personal Workspace
Content-Type: application/json`}
          language="http"
          filename="HTTP Request Headers"
        />
      </section>

      {/* Complete Endpoints Table */}
      <section className="space-y-4 pt-4">
        <h2 id="endpoints-table" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          API Endpoints Directory
        </h2>

        <div className="border border-[#1B2A4A]/10 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8F6F2] border-b border-[#1B2A4A]/10 text-[#6B7280] uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5 w-20">Method</th>
                <th className="px-4 py-2.5">Endpoint Path</th>
                <th className="px-4 py-2.5 font-sans">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2A4A]/10">
              {endpoints.map((ep, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        ep.method === "GET"
                          ? "bg-blue-100 text-blue-800"
                          : ep.method === "POST"
                          ? "bg-emerald-100 text-emerald-800"
                          : ep.method === "PATCH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-[#111111] whitespace-nowrap">
                    {ep.path}
                  </td>
                  <td className="px-4 py-2.5 font-sans text-[#6B7280]">
                    {ep.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Example cURL */}
      <section className="space-y-4 pt-4">
        <h2 id="example-requests" className="text-xl sm:text-2xl font-serif font-bold text-[#111111]">
          Example cURL Requests
        </h2>

        <h4 className="font-serif font-bold text-sm text-[#111111]">1. Execute Sub-15ms Hybrid Search</h4>
        <DocsCodeBlock
          code={`curl -X GET "http://localhost:8000/api/v1/search/code?q=session%20revocation&repo_id=repo_123" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "X-Workspace-Id: $WORKSPACE_ID"`}
          language="bash"
        />

        <h4 className="font-serif font-bold text-sm text-[#111111] mt-4">2. Analyze Blast Radius for Requirement</h4>
        <DocsCodeBlock
          code={`curl -X POST "http://localhost:8000/api/v1/requirements/req_84/analyze" \\
  -H "Authorization: Bearer $CLERK_TOKEN" \\
  -H "X-Workspace-Id: $WORKSPACE_ID"`}
          language="bash"
        />
      </section>

    </article>
  );
}
