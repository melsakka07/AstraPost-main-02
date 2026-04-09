import type { ZodIssue } from "zod";

/**
 * Typed HTTP error factory for API route handlers.
 *
 * Replaces ad-hoc `new Response(JSON.stringify(...))` and
 * `NextResponse.json(...)` literals with a single consistent vocabulary.
 * All methods return a plain `Response` — compatible with both Next.js
 * App Router and standard Web API route handlers.
 *
 * @example
 *   if (!session) return ApiError.unauthorized();
 *   if (!post)    return ApiError.notFound("Post");
 *   if (err)      return ApiError.internal(err.message);
 */
export const ApiError = {
  /** 401 — caller is not authenticated. */
  unauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 }),

  /** 403 — caller is authenticated but lacks permission. */
  forbidden: (message = "Forbidden") => Response.json({ error: message }, { status: 403 }),

  /**
   * 400 — invalid input.
   * Pass a string for a simple message or a ZodIssue[] for structured errors.
   */
  badRequest: (messageOrIssues: string | ZodIssue[]) =>
    typeof messageOrIssues === "string"
      ? Response.json({ error: messageOrIssues }, { status: 400 })
      : Response.json({ error: "Validation failed", issues: messageOrIssues }, { status: 400 }),

  /** 404 — resource does not exist or is not visible to the caller. */
  notFound: (resource = "Resource") =>
    Response.json({ error: `${resource} not found` }, { status: 404 }),

  /** 409 — resource already exists. */
  conflict: (message = "Resource already exists") =>
    Response.json({ error: message }, { status: 409 }),

  /** 500 — unexpected server failure. */
  internal: (message = "Internal server error") =>
    Response.json({ error: message }, { status: 500 }),

  /** 503 — service temporarily unavailable (e.g. billing not configured). */
  serviceUnavailable: (message = "Service temporarily unavailable") =>
    Response.json({ error: message }, { status: 503 }),
} as const;
