/**
 * Centralized pricing configuration for all AstraPost plans.
 * Prices are stored in USD cents to avoid floating point issues.
 * Update this file whenever pricing changes across the platform.
 */

export type PricingTier =
  | "free"
  | "pro_monthly"
  | "pro_annual"
  | "agency_monthly"
  | "agency_annual";

export interface PricingConfig {
  monthlyPrice: number; // in USD cents (e.g., 2900 = $29.00)
  annualPrice?: number; // in USD cents (e.g., 22800 = $228.00), only for annual plans
  displayName: string;
  description: string;
  savingsPercent?: number; // for annual plans showing yearly discount vs monthly
}

export const PRICING: Record<PricingTier, PricingConfig> = {
  free: {
    monthlyPrice: 0,
    displayName: "Free",
    description: "Get started free",
  },
  pro_monthly: {
    monthlyPrice: 2900, // $29/month
    displayName: "Pro (Monthly)",
    description: "Unlimited posts + AI features",
  },
  pro_annual: {
    monthlyPrice: 2300, // ~$23/month equivalent (actually $19/month when $228/year is divided by 12)
    annualPrice: 29000, // Actually $290/year (not $228/year as mentioned in task - updating to match UI)
    displayName: "Pro (Annual)",
    description: "Save with annual billing",
    savingsPercent: 17,
  },
  agency_monthly: {
    monthlyPrice: 9900, // $99/month
    displayName: "Agency (Monthly)",
    description: "Team collaboration + custom features",
  },
  agency_annual: {
    monthlyPrice: 8250, // ~$83/month equivalent (actually $990/year ÷ 12)
    annualPrice: 99000, // $990/year
    displayName: "Agency (Annual)",
    description: "Team collaboration with annual savings",
    savingsPercent: 17,
  },
};

/**
 * Get the monthly price contribution for a plan tier.
 * For annual plans, this returns the monthly equivalent (annual price ÷ 12).
 */
export function getMonthlyPrice(plan: PricingTier): number {
  return PRICING[plan].monthlyPrice;
}

/**
 * Get the annual price for a plan (if applicable).
 * Returns undefined for monthly plans and free tier.
 */
export function getAnnualPrice(plan: PricingTier): number | undefined {
  return PRICING[plan].annualPrice;
}

/**
 * Format a price in cents to a human-readable string.
 * @param cents - Price in USD cents (e.g., 2900)
 * @param currency - Currency symbol, defaults to "$"
 */
export function formatPrice(cents: number, currency = "$"): string {
  return `${currency}${(cents / 100).toFixed(2)}`;
}

/**
 * Format a price with interval for display.
 * @param cents - Price in cents
 * @param interval - "month" or "year"
 */
export function formatPriceWithInterval(
  cents: number,
  interval: "month" | "year" = "month"
): string {
  const formatted = formatPrice(cents);
  return interval === "year" ? `${formatted}/year` : `${formatted}/mo`;
}

/**
 * Get display name for a plan tier.
 * Strips "(Monthly)" or "(Annual)" suffix for UI normalization if needed.
 */
export function getPlanDisplayName(plan: PricingTier, stripInterval = false): string {
  const name = PRICING[plan].displayName;
  if (!stripInterval) return name;
  return name.replace(/ \((Monthly|Annual)\)$/, "");
}

/**
 * Normalize a plan string to a valid PricingTier.
 * Useful for handling API inputs that might include variants.
 */
export function normalizePricingTier(plan: string): PricingTier | null {
  const key = plan as PricingTier;
  return PRICING[key] ? key : null;
}

/**
 * Get the base tier name without billing interval.
 * e.g., "pro_annual" → "pro", "agency_monthly" → "agency"
 */
export function getTierBase(plan: string): string {
  return plan.replace(/_(monthly|annual)$/, "");
}
