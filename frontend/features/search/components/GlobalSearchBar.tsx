"use client";
import { useState, useRef, useEffect } from "react";
import { useSearch } from "../api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import { type SearchResultItem } from "@/lib/mock-data/search";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const MATCH_TYPE_LABEL: Record<string, string> = {
  semantic: "Semantic",
  symbol: "Symbol",
  exact: "Exact",
};

export function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const { activeRepositoryId } = useWorkspaceStore();
  const { data: results, isFetching } = useSearch(
    debouncedQuery,
    activeRepositoryId,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-80">
      <input
        type="text"
        placeholder={
          activeRepositoryId ? "Search code..." : "Select a repo first"
        }
        value={query}
        disabled={!activeRepositoryId}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full border rounded-lg px-3 py-1.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      {open && debouncedQuery.trim().length > 1 && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-lg border shadow-lg z-50 max-h-80 overflow-y-auto">
          {isFetching && (
            <div className="px-4 py-2 text-xs text-gray-400">Searching...</div>
          )}
          {!isFetching && (!results || results.length === 0) && (
            <div className="px-4 py-3 text-sm text-gray-400">No results</div>
          )}
          {results?.map((item: SearchResultItem, i: number) => (
            <div
              key={i}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-0"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    item.match_type === "semantic"
                      ? "bg-purple-100 text-purple-700"
                      : item.match_type === "symbol"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {MATCH_TYPE_LABEL[item.match_type]}
                </span>
                <span className="text-xs text-gray-500 font-mono truncate">
                  {item.file_path}
                </span>
              </div>
              <pre className="text-xs text-gray-700 font-mono line-clamp-2 whitespace-pre-wrap">
                {item.snippet}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
