/**
 * Billing utilities — price ↔ plan mapping helpers.
 *
 * These helpers are the single source of truth for translating between
 * Stripe Price IDs and internal plan names. Import these wherever you
 * need to map prices to plans, rather than repeating the env-var logic.
 */

/**
 * Maps a Stripe Price ID to the internal plan name stored in the DB.
 * Returns "free" for any unrecognised price ID.
 */
export function priceToPlan(priceId: string | null | undefined): string {
  if (!priceId) return "free";
  const {
    STRIPE_PRICE_ID_MONTHLY,
    STRIPE_PRICE_ID_ANNUAL,
    STRIPE_PRICE_ID_AGENCY_MONTHLY,
    STRIPE_PRICE_ID_AGENCY_ANNUAL,
  } = process.env;
  if (STRIPE_PRICE_ID_MONTHLY && priceId === STRIPE_PRICE_ID_MONTHLY)
    return "pro_monthly";
  if (STRIPE_PRICE_ID_ANNUAL && priceId === STRIPE_PRICE_ID_ANNUAL)
    return "pro_annual";
  // Both agency billing cycles map to the single "agency" plan tier
  if (
    STRIPE_PRICE_ID_AGENCY_MONTHLY &&
    priceId === STRIPE_PRICE_ID_AGENCY_MONTHLY
  )
    return "agency";
  if (
    STRIPE_PRICE_ID_AGENCY_ANNUAL &&
    priceId === STRIPE_PRICE_ID_AGENCY_ANNUAL
  )
    return "agency";
  return "free";
}

/**
 * Maps an internal plan name to its Stripe Price ID.
 * Returns null for the free plan or any unrecognised name.
 */
export function planToPrice(plan: string): string | null {
  switch (plan) {
    case "pro_monthly":
      return process.env.STRIPE_PRICE_ID_MONTHLY ?? null;
    case "pro_annual":
      return process.env.STRIPE_PRICE_ID_ANNUAL ?? null;
    // "agency_monthly" and "agency_annual" are accepted from the checkout UI
    // but stored as "agency" in the DB — map both billing cycles here.
    case "agency":
    case "agency_monthly":
      return process.env.STRIPE_PRICE_ID_AGENCY_MONTHLY ?? null;
    case "agency_annual":
      return process.env.STRIPE_PRICE_ID_AGENCY_ANNUAL ?? null;
    default:
      return null;
  }
}

/**
 * Returns the set of valid non-free plan names accepted by the checkout endpoint.
 */
export const VALID_CHECKOUT_PLANS = [
  "pro_monthly",
  "pro_annual",
  "agency_monthly",
  "agency_annual",
] as const;

export type CheckoutPlan = (typeof VALID_CHECKOUT_PLANS)[number];
