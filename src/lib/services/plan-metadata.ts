import { getPlanLimits } from "@/lib/plan-limits";
import type { PlanType, PlanLimits } from "@/lib/plan-limits";

/**
 * Get plan metadata for display purposes (e.g. billing usage page, quota display).
 * Routes should use plan gate helpers for access control; this is for read-only metadata display.
 *
 * This service layer allows future enhancements like caching or analytics on plan metadata lookups.
 */
export function getPlanMetadata(plan: PlanType | string | null | undefined): PlanLimits {
  return getPlanLimits(plan);
}
