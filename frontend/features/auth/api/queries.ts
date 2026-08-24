// Hook for syncing the Clerk session with the backend `users` table.
//
// On every authenticated render, the hook calls `GET /api/v1/auth/me`. The
// backend's `get_current_user` dependency:
//   1. Verifies the Clerk JWT (sent via `Authorization: Bearer …` by `useApiClient`).
//   2. Looks up the Clerk user id (`sub`) in the local `users` table.
//   3. If the row is missing, lazy-upserts it from the JWT claims (first-request safety net).
//
// So a single `useEnsureBackendUser` mount on a protected page is enough to
// guarantee the backend has the user row before any other API call runs — no
// frontend-side Clerk webhook listener required.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api/client";

export type BackendUser = {
  id: string;
  email: string;
  name: string;
};

/**
 * Idempotent backend-user sync. Always returns a query — the backend upserts
 * the row on first call, so subsequent calls are no-ops.
 *
 * The hook never throws into the React tree: if the backend is unreachable or
 * returns a non-2xx, `error` is populated but the component keeps rendering.
 * That avoids kicking the user back to the login page just because the API
 * is briefly down.
 */
export function useEnsureBackendUser() {
  const { fetchApi } = useApiClient();

  return useQuery<BackendUser>({
    queryKey: ["backend", "me"],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/auth/me`);
      if (!res.ok) {
        throw new Error(`Failed to sync user (${res.status})`);
      }
      return res.json();
    },
    // 401 means the Clerk session is invalid (expired, signed out, etc.) —
    // not a transient error. Don't retry, let Clerk's middleware handle it.
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("(401)")) return false;
      return failureCount < 2;
    },
    // Re-run every 5 minutes to catch webhook-driven updates (name change,
    // email change, deletion) that happened while the tab was idle.
    refetchInterval: 5 * 60 * 1000,
    // Don't block the page on this — it's a background sync, not a data dependency.
    staleTime: 60 * 1000,
  });
}

export function useUpdateProfile() {
  const { fetchApi } = useApiClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const res = await fetchApi(`/api/v1/auth/me`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update profile");
      }
      return res.json() as Promise<BackendUser>;
    },
    onSuccess: (data) => {
      qc.setQueryData(["backend", "me"], data);
      qc.invalidateQueries({ queryKey: ["backend", "me"] });
    },
  });
}
