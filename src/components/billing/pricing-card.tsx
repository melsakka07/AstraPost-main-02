import { Check } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PricingPlan {
  name: string;
  description: string;
  price: string;
  interval: string;
  features: string[];
  actionLabel: string;
  popular?: boolean;
  priceId: string; // The ID used for checkout (e.g. "pro_monthly")
  /** Per-month equivalent shown on annual plans, e.g. "~$24/mo" */
  perMonthEquivalent?: string;
  /** Savings percentage vs monthly billing, e.g. 17 */
  savingsPercent?: number;
}

interface PricingCardProps {
  plan: PricingPlan;
  currentPlan?: string;
  currentBillingCycle?: "monthly" | "annual";
  isLoading?: boolean;
  onSelect?: (priceId: string) => void;
}

/**
 * Tier order for determining upgrade/downgrade direction.
 * free: 0, pro: 1, agency: 2
 */
const TIER_ORDER = { free: 0, pro: 1, agency: 2 } as const;

type PlanTier = keyof typeof TIER_ORDER;

/**
 * Extracts the base tier from a plan identifier by removing the billing cycle suffix.
 * e.g., "pro_monthly" → "pro", "agency_annual" → "agency", "free" → "free"
 */
function extractTier(plan: string): PlanTier {
  const tier = plan.replace(/_(monthly|annual)$/, "") as PlanTier;
  // Validate that the result is a known tier
  if (tier in TIER_ORDER) return tier;
  // Fallback for any unexpected values
  return "free";
}

/**
 * Determines the button state (label and disabled) for a pricing card based on
 * the user's current plan and the card's priceId.
 *
 * Returns an object with:
 * - label: The button text to display
 * - disabled: Whether the button should be disabled
 */
function getButtonState(
  currentPlan: string | undefined,
  priceId: string,
  defaultLabel: string,
  currentBillingCycle?: "monthly" | "annual"
): { label: string; disabled: boolean } {
  // No current plan → show default label (upgrade action)
  if (!currentPlan) {
    return { label: defaultLabel, disabled: false };
  }

  const currentTier = extractTier(currentPlan);
  const cardTier = extractTier(priceId);
  const currentRank = TIER_ORDER[currentTier];
  const cardRank = TIER_ORDER[cardTier];

  // Same tier and same billing cycle → Current Plan (disabled)
  if (currentPlan === priceId) {
    return { label: "Current Plan", disabled: true };
  }

  // Same tier but different billing cycle → Switch action
  if (currentTier === cardTier) {
    // Pro monthly viewing annual, or vice versa
    if (currentTier === "pro") {
      const targetCycle = priceId.includes("_annual") ? "Annual" : "Monthly";
      return { label: `Switch to ${targetCycle}`, disabled: false };
    }
    // Agency tier: use currentBillingCycle prop to determine current plan
    if (currentTier === "agency") {
      // Determine the card's billing cycle from its priceId
      const cardCycle = priceId.includes("_annual") ? "annual" : "monthly";
      const isCurrentCycle = currentBillingCycle === cardCycle;

      if (isCurrentCycle) {
        return { label: "Current Plan", disabled: true };
      }
      const targetCycle = cardCycle === "annual" ? "Annual" : "Monthly";
      return { label: `Switch to ${targetCycle}`, disabled: false };
    }
  }

  // Different tier → upgrade, downgrade, or portal manage
  if (currentRank > cardRank) {
    // Moving to a lower tier (e.g., Pro → Free, Agency → Pro)
    return { label: "Downgrade", disabled: false };
  }

  if (currentRank < cardRank) {
    // Moving to a higher tier (e.g., Free → Pro, Pro → Agency)
    return { label: defaultLabel, disabled: false };
  }

  // Fallback: same tier but we couldn't determine the exact case
  return { label: defaultLabel, disabled: false };
}

// Static USD→SAR conversion table (refresh quarterly). SAR rate: 1 USD ≈ 3.75 SAR.
function getMenaPrice(price: string): string | null {
  const num = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (isNaN(num) || num === 0) return null;
  const sar = Math.round(num * 3.75);
  return `${sar.toLocaleString()} ر.س`;
}

export function PricingCard({
  plan,
  currentPlan,
  currentBillingCycle,
  isLoading,
  onSelect,
}: PricingCardProps) {
  const locale = useLocale();
  const menaPrice = locale === "ar" ? getMenaPrice(plan.price) : null;

  // Compute button label and disabled state using the tier-aware logic
  const { label: buttonLabel, disabled: isDisabled } = getButtonState(
    currentPlan,
    plan.priceId,
    plan.actionLabel,
    currentBillingCycle
  );

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        plan.popular ? "border-primary z-10 scale-105 shadow-lg" : "border-border",
        "transition-all duration-200 hover:shadow-md"
      )}
    >
      {plan.popular && (
        <div className="absolute -top-4 right-0 left-0 flex justify-center">
          <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid flex-1 gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground">/{plan.interval}</span>
        </div>
        {menaPrice && <p className="text-muted-foreground/70 text-sm">~{menaPrice}</p>}
        {plan.perMonthEquivalent && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{plan.perMonthEquivalent}</span>
            {plan.savingsPercent && (
              <span className="font-medium text-green-600 dark:text-green-400">
                Save {plan.savingsPercent}%
              </span>
            )}
          </div>
        )}
        <ul className="space-y-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="text-primary h-4 w-4" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={plan.popular ? "default" : "outline"}
          disabled={isLoading || isDisabled}
          onClick={() => onSelect?.(plan.priceId)}
        >
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
