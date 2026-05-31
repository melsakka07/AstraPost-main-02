import { z } from "zod";

/**
 * Shared PlanLimitPayload type + client-safe response parser.
 *
 * The backend returns a 402 JSON body via `buildPlanLimitPayload()` /
 * `createPlanLimitResponse()` in `@/lib/middleware/require-plan`. This file
 * provides a single-source-of-truth interface so every client component
 * doesn't need its own inline copy.
 */

export const planLimitPayloadSchema = z.object({
  error: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  feature: z.string().optional(),
  plan: z.string().optional(),
  limit: z.number().int().nullable().optional(),
  used: z.number().int().optional(),
  remaining: z.number().int().nullable().optional(),
  upgrade_url: z.string().url().optional(),
  suggested_plan: z.string().optional(),
  trial_active: z.boolean().optional(),
  reset_at: z.string().nullable().optional(),
});

export type PlanLimitPayload = z.infer<typeof planLimitPayloadSchema>;

/**
 * Attempt to parse a 402 plan-limit JSON body from a `Response`.
 * Returns the payload on success, `null` on any parse failure.
 */
export async function parsePlanLimitResponse(response: Response): Promise<PlanLimitPayload | null> {
  try {
    const json = await response.json();
    const parsed = planLimitPayloadSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
