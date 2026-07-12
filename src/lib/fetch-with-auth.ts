import { toast } from "sonner";

/**
 * Global 401 interceptor for API calls.
 *
 * Wraps native fetch() with same API, but intercepts 401 responses
 * to show a toast notification and redirect to login with a callback URL.
 *
 * If the 401 body contains an X-token-specific error code
 * ({@link X_TOKEN_ERROR_CODES}), the redirect is suppressed and a
 * custom "x-reconnect-required" event is dispatched instead so the
 * dashboard can show an in-app reconnect prompt.
 *
 * Only runs on client side (checks typeof window !== "undefined").
 *
 * @example
 * import { fetchWithAuth } from "@/lib/fetch-with-auth";
 * const res = await fetchWithAuth("/api/posts");
 */

/** Error codes that indicate an X token issue rather than a dead session. */
const X_TOKEN_ERROR_CODES = new Set(["X_SESSION_EXPIRED", "X_TOKEN_EXPIRED", "X_ACCOUNT_INACTIVE"]);

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  // Intercept 401 responses on client side
  if (response.status === 401 && typeof window !== "undefined") {
    // Check if this is an X-token-specific expiry rather than a full session expiry
    let isXTokenIssue = false;
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body?.code && X_TOKEN_ERROR_CODES.has(body.code)) {
        isXTokenIssue = true;
      }
    } catch {
      // Body is not JSON or unreadable — treat as normal session expiry
    }

    if (isXTokenIssue) {
      // Surface an in-app reconnect prompt instead of bouncing to /login
      window.dispatchEvent(new CustomEvent("x-reconnect-required"));
      return response;
    }

    // Genuine session expiry — redirect to login
    const callbackUrl = window.location.pathname + window.location.search;
    toast.error("Session expired. Please log in again.");
    window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return response;
  }

  // Return original response for all other status codes
  return response;
}
