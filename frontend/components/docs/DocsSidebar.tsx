"use client";

import React from "react";
import {
  BookOpen,
  Layers,
  Zap,
  Kanban,
  FileCode2,
  Terminal,
  Shield,
  HelpCircle,
  Sparkles,
  Search,
  Server,
  Code2,
  Workflow
} from "lucide-react";

export interface NavGroup {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[];
}

export const DOCS_NAV_GROUPS: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      {
        id: "getting-started",
        label: "Introduction & Setup",
        icon: <BookOpen className="w-4 h-4" />,
      },
      {
        id: "architecture",
        label: "System Architecture",
        icon: <Layers className="w-4 h-4" />,
      },
    ],
  },
  {
    title: "Core Engines",
    items: [
      {
        id: "core-concepts",
        label: "Core Concepts & Search",
        icon: <Zap className="w-4 h-4" />,
        badge: "RRF 15ms",
      },
      {
        id: "jira-integration",
        label: "Jira & Kanban Sync",
        icon: <Kanban className="w-4 h-4" />,
        badge: "REST API",
      },
    ],
  },
  {
    title: "Guides & Reference",
    items: [
      {
        id: "user-guides",
        label: "User Guides & Workflows",
        icon: <Workflow className="w-4 h-4" />,
      },
      {
        id: "project-structure",
        label: "Project Structure",
        icon: <FileCode2 className="w-4 h-4" />,
      },
      {
        id: "api-reference",
        label: "REST API Reference",
        icon: <Terminal className="w-4 h-4" />,
        badge: "OpenAPI",
      },
    ],
  },
  {
    title: "DevOps & Community",
    items: [
      {
        id: "contributing",
        label: "Contributing & Testing",
        icon: <Code2 className="w-4 h-4" />,
      },
      {
        id: "deployment",
        label: "Deployment & Docker",
        icon: <Server className="w-4 h-4" />,
      },
      {
        id: "troubleshooting",
        label: "Troubleshooting & FAQ",
        icon: <HelpCircle className="w-4 h-4" />,
      },
    ],
  },
];

interface Props {
  activeSection: string;
  onSelectSection: (id: string) => void;
  onOpenSearch: () => void;
}

export function DocsSidebar({ activeSection, onSelectSection, onOpenSearch }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r border-[#1B2A4A]/10 bg-white/70 backdrop-blur-md p-4 hidden lg:flex flex-col gap-6 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
      
      {/* Quick Search Button */}
      <button
        onClick={onOpenSearch}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#F8F6F2] hover:bg-slate-100 border border-[#1B2A4A]/10 text-xs text-muted hover:text-foreground transition-all shadow-2xs group"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
          <span>Quick search docs...</span>
        </span>
        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#1B2A4A]/15 text-[#1B2A4A] shadow-2xs font-semibold">
          ⌘K
        </kbd>
      </button>

      {/* Navigation Groups */}
      <div className="space-y-6">
        {DOCS_NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted px-2">
              {group.title}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSection(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      isActive
                        ? "bg-accent text-white font-semibold shadow-xs"
                        : "text-[#111111] hover:bg-[#F8F6F2] hover:text-[#1B2A4A]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <span className={isActive ? "text-white" : "text-muted"}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-[#1B2A4A]/10 text-[#1B2A4A]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </aside>
  );
}
