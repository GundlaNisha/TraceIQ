import { useAuth } from "@clerk/nextjs";
import { API_BASE_URL } from "./config";

export function useApiClient() {
  const { getToken } = useAuth();
  
  const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken();
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
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
