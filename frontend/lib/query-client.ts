import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000, // 30s before a refetch is considered needed
      refetchOnWindowFocus: false,
    },
  },
});
