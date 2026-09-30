import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const CACHE_VERSION = "traceiq-cache-v1.0";
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 mins fresh window (instantly rendered, stale-while-revalidate)
      gcTime: CACHE_MAX_AGE,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// SSR-safe storage persister with debounced localStorage writes
export const clientPersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "TRACEIQ_QUERY_CACHE",
  throttleTime: 1000,
});

// Ephemeral and polling keys to exclude from localStorage persistence
const EXCLUDED_QUERY_KEYS = new Set([
  "analysis_job",
  "repo_sync_status",
  "agent_execution",
  "ai_stream",
]);

export const persistOptions = {
  persister: clientPersister,
  buster: CACHE_VERSION,
  maxAge: CACHE_MAX_AGE,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string }; queryKey: readonly unknown[] }) => {
      if (query.state.status !== "success") return false;
      const primaryKey = String(query.queryKey[0] ?? "");
      return !EXCLUDED_QUERY_KEYS.has(primaryKey);
    },
  },
};
