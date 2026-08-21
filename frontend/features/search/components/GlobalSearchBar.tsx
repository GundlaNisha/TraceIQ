"use client";

import { useState, useRef, useEffect } from "react";
import { useSearch } from "../api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import { useRepositories } from "@/features/repositories/api/queries";
import { type SearchResultItem, type Repository } from "@/lib/types/api";
import {
  Search,
  FolderGit2,
  ChevronDown,
  X,
  FileCode2,
  Sparkles,
  Command,
  Check,
  Code2,
  FileText,
} from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const MATCH_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  semantic: {
    label: "Semantic AI",
    className: "bg-purple-50 text-purple-700 border-purple-200/60",
  },
  symbol: {
    label: "Symbol Match",
    className: "bg-blue-50 text-blue-700 border-blue-200/60",
  },
  exact: {
    label: "Exact Match",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  },
};

export function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const repoDropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 250);
  const { activeRepositoryId, setActiveRepositoryId } = useWorkspaceStore();
  const { data: repos = [] } = useRepositories();

  // If no active repo is set but repos exist, default to the first repo
  useEffect(() => {
    if (!activeRepositoryId && repos.length > 0) {
      setActiveRepositoryId(repos[0].id);
    }
  }, [activeRepositoryId, repos, setActiveRepositoryId]);

  const activeRepo = repos.find((r: Repository) => r.id === activeRepositoryId);

  const { data: results = [], isFetching } = useSearch(
    debouncedQuery,
    activeRepositoryId
  );

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setRepoDropdownOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
      if (
        repoDropdownRef.current &&
        !repoDropdownRef.current.contains(e.target as Node)
      ) {
        setRepoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3 w-full max-w-2xl">
      {/* 1. Repository Switcher Pill */}
      <div ref={repoDropdownRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/90 hover:bg-slate-50 text-foreground border border-border/60 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="max-w-[140px] truncate font-medium">
            {activeRepo ? activeRepo.name : "Select Repo"}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 opacity-70" />
        </button>

        {repoDropdownOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-white border border-border/60 shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
              Active Repository
            </div>
            {repos.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No repositories found</div>
            ) : (
              <div className="max-h-56 overflow-y-auto py-1">
                {repos.map((repo: Repository) => {
                  const isSelected = repo.id === activeRepositoryId;
                  return (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => {
                        setActiveRepositoryId(repo.id);
                        setRepoDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                        isSelected ? "bg-accent/5 font-semibold text-accent" : "text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{repo.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Global Code & Symbol Search Input */}
      <div ref={containerRef} className="relative flex-1">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-accent" />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              activeRepo
                ? `Search code, functions, symbols in ${activeRepo.name}…`
                : "Select a repository to search code…"
            }
            value={query}
            disabled={!activeRepo}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="w-full pl-9 pr-16 py-1.5 text-xs bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white text-foreground rounded-xl border border-border/60 focus:border-accent/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-muted-foreground/70"
          />

          {/* Clear button or ⌘K keyboard shortcut pill */}
          <div className="absolute right-2.5 flex items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                }}
                className="p-0.5 rounded-md hover:bg-slate-200 text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-white border border-border/60 rounded-md shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            )}
          </div>
        </div>

        {/* 3. Search Results Dropdown Flyout */}
        {open && debouncedQuery.trim().length > 1 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-border/60 shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Code2 className="w-3.5 h-3.5 text-accent" />
                <span>Code Search Results</span>
                {results && results.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] text-slate-700 font-bold">
                    {results.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                in <span className="font-semibold text-foreground">{activeRepo?.name}</span>
              </span>
            </div>

            {/* Results body */}
            <div className="overflow-y-auto max-h-80 divide-y divide-border/30">
              {isFetching && (
                <div className="px-5 py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent animate-spin" />
                  Searching codebase…
                </div>
              )}

              {!isFetching && (!results || results.length === 0) && (
                <div className="px-5 py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                  <FileText className="w-6 h-6 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No matches found</p>
                  <p className="text-[11px]">Try searching for a different function name, symbol, or keyword.</p>
                </div>
              )}

              {!isFetching &&
                results?.map((item: SearchResultItem, i: number) => {
                  const badge =
                    MATCH_TYPE_BADGE[item.match_type] ?? MATCH_TYPE_BADGE.exact;
                  return (
                    <div
                      key={i}
                      className="px-4 py-3 hover:bg-slate-50/90 cursor-pointer transition-colors group"
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 truncate">
                          <FileCode2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent shrink-0 transition-colors" />
                          <span className="text-xs font-semibold font-mono text-foreground truncate">
                            {item.file_path}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <pre className="text-[11px] font-mono text-slate-700 bg-slate-100/70 group-hover:bg-white p-2 rounded-lg border border-border/30 line-clamp-2 whitespace-pre-wrap leading-relaxed transition-colors">
                        {item.snippet}
                      </pre>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
