import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

/**
 * Fetch data from admin API routes in Server Components.
 *
 * This helper is used to pre-fetch data on the server so client components
 * can display content immediately without a loading flash.
 *
 * @param endpoint - The API endpoint path (e.g., "/subscribers", "/billing")
 * @param params - Query parameters to include in the request
 * @returns The parsed JSON response, or null if the fetch fails
 *
 * @example
 * ```ts
 * export default async function AdminSubscribersPage() {
 *   const data = await fetchAdminData("/subscribers", { page: 1, limit: 25 });
 *   return <SubscribersTable initialData={data} />;
 * }
 * ```
 */
export async function fetchAdminData<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL) {
      logger.warn("admin_fetch_missing_app_url", {
        message: "NEXT_PUBLIC_APP_URL is not set — admin SSR data fetching will fail",
      });
    }
    const url = new URL(`/api/admin${endpoint}`, baseUrl);

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        url.searchParams.set(k, String(v));
      });
    }

    const res = await fetch(url.toString(), {
      headers: { Cookie: cookieHeader },
      cache: "no-store", // Ensure fresh data on every request
    });

    if (!res.ok) {
      logger.warn("admin_ssr_fetch_failed", {
        endpoint,
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }

    const json = await res.json();
    return json;
  } catch (err) {
    logger.error("admin_ssr_fetch_error", {
      endpoint,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return null;
  }
}
