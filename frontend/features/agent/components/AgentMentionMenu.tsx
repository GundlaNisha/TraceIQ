"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FolderGit2,
  Layers,
  GitPullRequest,
  Search,
  Check,
  Tag,
  Sparkles,
} from "lucide-react";
import type { TaggedEntity } from "../types";

export interface MentionItem {
  type: "repo" | "req" | "pr";
  id: string;
  label: string;
  subtitle: string;
  badge?: string;
  raw?: any;
}

interface AgentMentionMenuProps {
  isOpen: boolean;
  query: string;
  repositories: any[];
  requirements: any[];
  pullRequests: any[];
  onSelect: (item: MentionItem) => void;
  onClose: () => void;
}

export function AgentMentionMenu({
  isOpen,
  query,
  repositories,
  requirements,
  pullRequests,
  onSelect,
  onClose,
}: AgentMentionMenuProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "repo" | "req" | "pr">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compile all available mentionable entities
  const allItems = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [];

    // 1. Repositories
    for (const r of repositories) {
      items.push({
        type: "repo",
        id: String(r.id),
        label: r.name || r.repo_url?.split("/").pop() || "repository",
        subtitle: `Branch: ${r.default_branch || "main"}`,
        badge: r.sync_status,
        raw: r,
      });
    }

    // 2. Requirements / Jira Stories
    for (const req of requirements) {
      items.push({
        type: "req",
        id: String(req.id || req.jira_key || ""),
        label: req.jira_key ? `[${req.jira_key}] ${req.title}` : req.title,
        subtitle: req.jira_status ? `Status: ${req.jira_status}` : "Requirement Story",
        badge: req.jira_key || "BRD",
        raw: req,
      });
    }

    // 3. Pull Requests
    for (const pr of pullRequests) {
      items.push({
        type: "pr",
        id: String(pr.id || pr.pr_number || ""),
        label: pr.pr_number ? `PR #${pr.pr_number}: ${pr.pr_title || pr.title || "Pull Request"}` : pr.title || "PR",
        subtitle: pr.status ? `Review Status: ${pr.status}` : "Pull Request Diff",
        badge: pr.risk_score ? `Risk: ${pr.risk_score}` : "PR",
        raw: pr,
      });
    }

    return items;
  }, [repositories, requirements, pullRequests]);

  // Filter items by active category and search query
  const filteredItems = useMemo(() => {
    let list = allItems;
    if (activeCategory !== "all") {
      list = list.filter((i) => i.type === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.subtitle.toLowerCase().includes(q) ||
          (i.badge && i.badge.toLowerCase().includes(q))
      );
    }
    return list.slice(0, 15);
  }, [allItems, activeCategory, query]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, activeCategory]);

  // Keyboard navigation listener
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filteredItems.length > 0) {
          e.preventDefault();
          onSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onSelect, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-4 mb-3 w-[340px] sm:w-[420px] max-h-[340px] rounded-2xl border border-border/80 bg-white/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Top Header & Search Bar */}
      <div className="border-b border-border/60 p-2.5 bg-slate-50/70">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-serif uppercase tracking-wider text-foreground">
            <Tag className="h-3.5 w-3.5 text-accent" />
            <span>Tag Context via @</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            Use ↑↓ to navigate • ↵ select • esc exit
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shrink-0 ${
              activeCategory === "all"
                ? "bg-accent text-white shadow-2xs"
                : "bg-white text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-border/60"
            }`}
          >
            All ({allItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("repo")}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition shrink-0 ${
              activeCategory === "repo"
                ? "bg-accent text-white shadow-2xs"
                : "bg-white text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-border/60"
            }`}
          >
            <FolderGit2 className="h-3 w-3" />
            <span>Repos ({repositories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("req")}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition shrink-0 ${
              activeCategory === "req"
                ? "bg-accent text-white shadow-2xs"
                : "bg-white text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-border/60"
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>Stories ({requirements.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("pr")}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition shrink-0 ${
              activeCategory === "pr"
                ? "bg-accent text-white shadow-2xs"
                : "bg-white text-muted-foreground hover:bg-slate-100 hover:text-foreground border border-border/60"
            }`}
          >
            <GitPullRequest className="h-3 w-3" />
            <span>PRs ({pullRequests.length})</span>
          </button>
        </div>
      </div>

      {/* Mention Items List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[230px]">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No matching entities found for &quot;{query}&quot;.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer ${
                  isSelected
                    ? "bg-accent/10 text-accent font-semibold border border-accent/20 shadow-2xs"
                    : "text-foreground hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`rounded-lg p-1.5 shrink-0 ${
                      item.type === "repo"
                        ? "bg-blue-50 text-blue-600"
                        : item.type === "req"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {item.type === "repo" && <FolderGit2 className="h-3.5 w-3.5" />}
                    {item.type === "req" && <Layers className="h-3.5 w-3.5" />}
                    {item.type === "pr" && <GitPullRequest className="h-3.5 w-3.5" />}
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-xs font-medium text-foreground">
                      {item.label}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground font-normal">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-medium text-muted-foreground shrink-0 border border-border/40">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
