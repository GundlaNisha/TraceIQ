"use client";

import React, { useState, useEffect } from "react";
import { DocsNav } from "./DocsNav";
import { DocsSidebar, DOCS_NAV_GROUPS } from "./DocsSidebar";
import { DocsSearchModal } from "./DocsSearchModal";
import { DocsTOC, TOCItem } from "./DocsTOC";

// Content Modules
import { GettingStartedDoc } from "./content/GettingStartedDoc";
import { ArchitectureDoc } from "./content/ArchitectureDoc";
import { CoreConceptsDoc } from "./content/CoreConceptsDoc";
import { JiraIntegrationDoc } from "./content/JiraIntegrationDoc";
import { UserGuidesDoc } from "./content/UserGuidesDoc";
import { ProjectStructureDoc } from "./content/ProjectStructureDoc";
import { ApiReferenceDoc } from "./content/ApiReferenceDoc";
import { ContributingDoc } from "./content/ContributingDoc";
import { DeploymentDoc } from "./content/DeploymentDoc";
import { TroubleshootingDoc } from "./content/TroubleshootingDoc";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Table of Contents definitions per section
const TOC_MAP: Record<string, TOCItem[]> = {
  "getting-started": [
    { id: "introduction", label: "Introduction", level: 2 },
    { id: "why-traceiq", label: "Why TraceIQ?", level: 2 },
    { id: "quickstart", label: "5-Minute Quickstart", level: 2 },
    { id: "prerequisites", label: "System Prerequisites", level: 2 },
    { id: "environment-variables", label: "Environment Configuration", level: 2 },
  ],
  architecture: [
    { id: "architecture-overview", label: "Architecture Overview", level: 2 },
    { id: "four-tier-model", label: "The 4-Tier Model", level: 2 },
    { id: "architecture-diagram", label: "Data Pipeline Topology", level: 2 },
    { id: "technology-stack", label: "Technology Stack", level: 2 },
  ],
  "core-concepts": [
    { id: "ast-parsing", label: "1. AST Parsing & Breadcrumbs", level: 2 },
    { id: "hybrid-rrf-search", label: "2. Sub-15ms Hybrid Search (RRF)", level: 2 },
    { id: "blast-radius-analysis", label: "3. 2-Hop Blast Radius Engine", level: 2 },
    { id: "automated-pr-reviews", label: "4. Automated PR Review Engine", level: 2 },
    { id: "workspaces-and-rbac", label: "5. Multi-Tenant RBAC Matrix", level: 2 },
  ],
  "jira-integration": [
    { id: "jira-connection-setup", label: "Connecting Jira to Workspace", level: 2 },
    { id: "adf-to-markdown", label: "ADF Document Parser", level: 2 },
    { id: "kanban-and-sprints", label: "Kanban & Sprints Browsing", level: 2 },
    { id: "upstream-sync", label: "Requirement Synchronization", level: 2 },
  ],
  "user-guides": [
    { id: "managing-workspaces", label: "1. Team Workspaces & Invites", level: 2 },
    { id: "connecting-repositories", label: "2. Connecting Repositories", level: 2 },
    { id: "requirements-and-analysis", label: "3. Requirements & Blast Radius", level: 2 },
    { id: "pull-request-reviews", label: "4. Reviewing Pull Requests", level: 2 },
    { id: "traceability-matrix", label: "5. Compliance & Audit Matrix", level: 2 },
  ],
  "project-structure": [
    { id: "repository-tree", label: "Repository Directory Tree", level: 2 },
    { id: "database-models", label: "Database Schema & ORM Models", level: 2 },
  ],
  "api-reference": [
    { id: "authentication-headers", label: "Auth & Workspace Headers", level: 2 },
    { id: "endpoints-table", label: "API Endpoints Directory", level: 2 },
    { id: "example-requests", label: "Example cURL Requests", level: 2 },
  ],
  contributing: [
    { id: "dev-workflow", label: "Local Dev Workflow", level: 2 },
    { id: "running-tests", label: "Running Test Suites", level: 2 },
    { id: "code-style", label: "Code Formatting & Quality", level: 2 },
  ],
  deployment: [
    { id: "docker-container", label: "Docker Containerization", level: 2 },
    { id: "database-provisioning", label: "Database Provisioning", level: 2 },
    { id: "celery-scaling", label: "Celery Worker Scaling", level: 2 },
    { id: "security-hardening", label: "Security & Hardening", level: 2 },
  ],
  troubleshooting: [
    { id: "common-errors", label: "Common Diagnostic Fixes", level: 2 },
    { id: "faq", label: "Frequently Asked Questions", level: 2 },
  ],
};

// Flat list of all sections for pagination
const ALL_SECTIONS = DOCS_NAV_GROUPS.flatMap((g) => g.items);

export function DocsLayout() {
  const [activeSection, setActiveSection] = useState<string>("getting-started");
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Sync hash/query on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sec = params.get("section");
    if (sec && TOC_MAP[sec]) {
      setActiveSection(sec);
    }
  }, []);

  const handleSelectSection = (id: string) => {
    setActiveSection(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const url = new URL(window.location.href);
    url.searchParams.set("section", id);
    window.history.pushState({}, "", url.toString());
  };

  const currentIndex = ALL_SECTIONS.findIndex((s) => s.id === activeSection);
  const prevSection = currentIndex > 0 ? ALL_SECTIONS[currentIndex - 1] : null;
  const nextSection = currentIndex < ALL_SECTIONS.length - 1 ? ALL_SECTIONS[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-[#F8F6F2] text-[#111111] flex flex-col selection:bg-accent selection:text-white">
      {/* Top Header Nav */}
      <DocsNav
        onOpenSearch={() => setSearchModalOpen(true)}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
      />

      {/* Main 3-Column Shell */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex">
        {/* Left Sidebar */}
        <DocsSidebar
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          onOpenSearch={() => setSearchModalOpen(true)}
        />

        {/* Center Main Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-10">
          {activeSection === "getting-started" && <GettingStartedDoc />}
          {activeSection === "architecture" && <ArchitectureDoc />}
          {activeSection === "core-concepts" && <CoreConceptsDoc />}
          {activeSection === "jira-integration" && <JiraIntegrationDoc />}
          {activeSection === "user-guides" && <UserGuidesDoc />}
          {activeSection === "project-structure" && <ProjectStructureDoc />}
          {activeSection === "api-reference" && <ApiReferenceDoc />}
          {activeSection === "contributing" && <ContributingDoc />}
          {activeSection === "deployment" && <DeploymentDoc />}
          {activeSection === "troubleshooting" && <TroubleshootingDoc />}

          {/* Chapter Pagination Footer */}
          <div className="mt-16 pt-8 border-t border-[#1B2A4A]/10 flex items-center justify-between gap-4">
            {prevSection ? (
              <button
                onClick={() => handleSelectSection(prevSection.id)}
                className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#1B2A4A]/10 hover:border-[#1B2A4A]/30 text-left transition-all shadow-2xs group"
              >
                <ChevronLeft className="w-4 h-4 text-muted group-hover:text-foreground" />
                <div>
                  <span className="text-[10px] font-mono uppercase text-muted block">Previous</span>
                  <span className="font-serif font-bold text-xs text-[#111111]">{prevSection.label}</span>
                </div>
              </button>
            ) : <div />}

            {nextSection && (
              <button
                onClick={() => handleSelectSection(nextSection.id)}
                className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#1B2A4A]/10 hover:border-[#1B2A4A]/30 text-right transition-all shadow-2xs group"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase text-muted block">Next</span>
                  <span className="font-serif font-bold text-xs text-[#111111]">{nextSection.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted group-hover:text-foreground" />
              </button>
            )}
          </div>
        </main>

        {/* Right Floating TOC */}
        <DocsTOC items={TOC_MAP[activeSection] || []} />
      </div>

      {/* Global Search Modal */}
      <DocsSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        onSelectSection={handleSelectSection}
      />
    </div>
  );
}
