import { toast } from "sonner";

/**
 * Global 401 interceptor for API calls.
 *
 * Wraps native fetch() with same API, but intercepts 401 responses
 * to show a toast notification and redirect to login with a callback URL.
 *
 * Only runs on client side (checks typeof window !== "undefined").
 *
 * @example
 * import { fetchWithAuth } from "@/lib/fetch-with-auth";
 * const res = await fetchWithAuth("/api/posts");
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  // Intercept 401 responses on client side
  if (response.status === 401 && typeof window !== "undefined") {
    const callbackUrl = window.location.pathname + window.location.search;
    toast.error("Session expired. Please log in again.");
    window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return response;
  }

  // Return original response for all other status codes
  return response;
}
