"use client";
import { type SearchResultItem } from "@/lib/types/api";

interface Props {
  results: SearchResultItem[];
  query: string;
}

export function SearchResults({ results, query }: Props) {
  if (!results.length)
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        No results for &quot;{query}&quot;
      </div>
    );

  const grouped = results.reduce<Record<string, SearchResultItem[]>>(
    (acc, item) => {
      acc[item.match_type] = [...(acc[item.match_type] ?? []), item];
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            {type} matches ({items.length})
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div key={i} className="bg-white rounded-lg border p-4">
                <div className="text-xs font-mono text-blue-600 mb-2">
                  {item.file_path}
                </div>
                <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap bg-gray-50 rounded p-2">
                  {item.snippet}
                </pre>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                  <span className="capitalize">{item.match_type || 'exact'} match</span>
                  {item.score !== undefined && (
                    <span>Score: {Math.round(item.score * 100)}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
