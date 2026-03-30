import { z } from "zod";

/**
 * Shared Zod sub-schemas used across multiple API routes.
 *
 * Route-specific schemas stay in their route file.
 * Any schema referenced by 2+ routes belongs here.
 */

// ─── X Subscription Tier ──────────────────────────────────────────────────────

/**
 * X (Twitter) subscription tier values returned by the X API v2.
 * - None: Free account
 * - Basic: $3/mo — long posts enabled, no blue checkmark
 * - Premium: $8/mo — long posts + blue checkmark
 * - PremiumPlus: $16-40/mo — long posts + blue checkmark + additional features
 */
export const xSubscriptionTierEnum = z.enum(["None", "Basic", "Premium", "PremiumPlus"]);

export type XSubscriptionTier = z.infer<typeof xSubscriptionTierEnum>;

// ─── Pagination ───────────────────────────────────────────────────────────────

/**
 * Standard page-based pagination query params.
 * Both fields coerce from query-string strings to numbers.
 *
 * @example
 *   const { page, limit } = paginationSchema.parse(
 *     Object.fromEntries(req.nextUrl.searchParams)
 *   );
 */
export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ─── Identifiers ──────────────────────────────────────────────────────────────

/** A UUID string (v4 format). */
export const uuidSchema = z.string().uuid("Invalid ID format");

// ─── Dates ───────────────────────────────────────────────────────────────────

/**
 * ISO-8601 date-time string with timezone offset.
 * Use `.transform(s => new Date(s))` at call-site when you need a Date object.
 *
 * @example
 *   scheduledAt: isoDateSchema.transform(s => new Date(s))
 */
export const isoDateSchema = z.string().datetime({ offset: true });

/**
 * Inclusive date range validated as ISO-8601 strings.
 * `from` must not be after `to`.
 */
export const dateRangeSchema = z
  .object({
    from: isoDateSchema,
    to:   isoDateSchema,
  })
  .refine((r) => new Date(r.from) <= new Date(r.to), {
    message: "'from' must not be after 'to'",
    path: ["from"],
  });
