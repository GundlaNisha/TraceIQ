import { useAuth } from "@clerk/nextjs";
import { API_BASE_URL } from "./config";
import { useWorkspaceStore } from "@/stores/workspace";

export function useApiClient() {
  const { getToken } = useAuth();
  
  const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    if (activeWorkspaceId && !headers.has("X-Workspace-Id")) {
      headers.set("X-Workspace-Id", activeWorkspaceId);
    }
    
    // Ensure we send content-type for POST/PUT if not explicitly set
    if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
      headers.set("Content-Type", "application/json");
    }
    
    const primaryUrl = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(primaryUrl, {
        ...options,
        headers,
      });
      return response;
    } catch (err) {
      // Fallback between localhost and 127.0.0.1 if IPv6/IPv4 loopback fails
      if (primaryUrl.includes("localhost:8000")) {
        const fallbackUrl = primaryUrl.replace("localhost:8000", "127.0.0.1:8000");
        return await fetch(fallbackUrl, {
          ...options,
          headers,
        });
      } else if (primaryUrl.includes("127.0.0.1:8000")) {
        const fallbackUrl = primaryUrl.replace("127.0.0.1:8000", "localhost:8000");
        return await fetch(fallbackUrl, {
          ...options,
          headers,
        });
      }
      throw err;
    }
  };
  
  return { fetchApi };
}
