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
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    return response;
  };
  
  return { fetchApi };
}
