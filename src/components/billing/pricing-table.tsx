"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChangePlanDialog } from "@/components/billing/change-plan-dialog";
import { PricingCard, PricingPlan } from "@/components/billing/pricing-card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const MONTHLY_PLANS: PricingPlan[] = [
  {
    name: "Free",
    description: "For individuals starting out.",
    price: "$0",
    interval: "month",
    features: [
      "20 Posts per month",
      "1 X Account",
      "20 AI Text Generations/month",
      "10 AI Image Generations/month",
      "7-day Analytics",
      "Tweet Inspiration & Import",
      "14-day Pro Trial Included",
    ],
    actionLabel: "Get Started",
    priceId: "free",
    popular: false,
  },
  {
    name: "Pro",
    description: "For growing creators.",
    price: "$29",
    interval: "month",
    features: [
      "Unlimited Posts",
      "3 X Accounts",
      "100 AI Text Generations/month",
      "50 AI Image Generations/month",
      "Thread Scheduling",
      "AI Agentic Posting",
      "A/B Variant Generator",
      "Viral Score & Best Times",
      "Competitor Analyzer",
      "Content Calendar & URL-to-Thread",
      "Reply Generator & Bio Optimizer",
      "Voice Profile",
      "Video & GIF Uploads",
      "90-day Analytics + CSV/PDF Export",
      "Unlimited Bookmarks",
    ],
    actionLabel: "Upgrade to Pro",
    priceId: "pro_monthly",
    popular: true,
  },
  {
    name: "Agency",
    description: "For teams and businesses.",
    price: "$99",
    interval: "month",
    features: [
      "Everything in Pro",
      "10 X Accounts",
      "Unlimited AI Generations",
      "Team Collaboration (up to 5)",
      "LinkedIn Integration",
      "1-year Analytics History",
      "White-label PDF Reports",
    ],
    actionLabel: "Upgrade to Agency",
    priceId: "agency_monthly",
    popular: false,
  },
];

const ANNUAL_PLANS: PricingPlan[] = [
  {
    name: "Free",
    description: "For individuals starting out.",
    price: "$0",
    interval: "year",
    features: [
      "20 Posts per month",
      "1 X Account",
      "20 AI Text Generations/month",
      "10 AI Image Generations/month",
      "7-day Analytics",
      "Tweet Inspiration & Import",
      "14-day Pro Trial Included",
    ],
    actionLabel: "Get Started",
    priceId: "free",
    popular: false,
  },
  {
    name: "Pro",
    description: "For growing creators.",
    price: "$290",
    interval: "year",
    features: [
      "Unlimited Posts",
      "4 X Accounts",
      "150 AI Text Generations/month",
      "50 AI Image Generations/month",
      "Thread Scheduling",
      "AI Agentic Posting",
      "A/B Variant Generator",
      "Viral Score & Best Times",
      "Competitor Analyzer",
      "Content Calendar & URL-to-Thread",
      "Reply Generator & Bio Optimizer",
      "Voice Profile",
      "Video & GIF Uploads",
      "90-day Analytics + CSV/PDF Export",
      "Unlimited Bookmarks",
      "Annual Bonus: +50 AI gens & extra X account",
      "2 Months Free",
    ],
    actionLabel: "Upgrade to Pro",
    priceId: "pro_annual",
    popular: true,
    perMonthEquivalent: "~$24/mo",
    savingsPercent: 17,
  },
  {
    name: "Agency",
    description: "For teams and businesses.",
    price: "$990",
    interval: "year",
    features: [
      "Everything in Pro",
      "10 X Accounts",
      "Unlimited AI Generations",
      "Team Collaboration (up to 5)",
      "LinkedIn Integration",
      "1-year Analytics History",
      "White-label PDF Reports",
      "2 Months Free",
    ],
    actionLabel: "Upgrade to Agency",
    priceId: "agency_annual",
    popular: false,
    perMonthEquivalent: "~$83/mo",
    savingsPercent: 17,
  },
];

interface PricingTableProps {
  currentPlan?: string;
  isLoggedIn?: boolean;
  currentBillingCycle?: "monthly" | "annual";
}

export function PricingTable({
  currentPlan,
  isLoggedIn = false,
  currentBillingCycle,
}: PricingTableProps) {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [changePlanDialog, setChangePlanDialog] = useState<{
    open: boolean;
    plan: string;
    planLabel: string;
    isUpgrade: boolean;
  }>({
    open: false,
    plan: "",
    planLabel: "",
    isUpgrade: false,
  });

  const plans = isAnnual ? ANNUAL_PLANS : MONTHLY_PLANS;

  const handleSelect = async (priceId: string) => {
    // Not logged in → redirect to register with plan pre-selected
    if (!isLoggedIn) {
      router.push(`/register?plan=${priceId}`);
      return;
    }

    // Get plan label for dialog
    const selectedPlan = plans.find((p) => p.priceId === priceId);
    const planLabel = selectedPlan?.name || priceId;

    // Paid user with active subscription → show change plan dialog for in-app changes
    // Free user clicking paid plan → go to checkout
    if (currentPlan && currentPlan !== "free") {
      // Determine if this is an upgrade or downgrade using tier-only comparison
      // This prevents billing cycle switches from being misclassified as upgrades
      const tierRanks: Record<string, number> = { free: 0, pro: 1, agency: 2 };
      const getTier = (plan: string) => plan.replace(/_(monthly|annual)$/, "");
      const currentRank = tierRanks[getTier(currentPlan)] ?? 0;
      const targetRank = tierRanks[getTier(priceId)] ?? 0;
      const isUpgrade = targetRank > currentRank;

      // Open dialog for all plan changes
      setChangePlanDialog({
        open: true,
        plan: priceId,
        planLabel,
        isUpgrade,
      });
      return;
    }

    // Free user clicking a paid plan → create checkout session
    setIsLoading(priceId);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: priceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setIsLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-13 py-8">
      <div className="flex items-center gap-4">
        <Label
          htmlFor="billing-interval"
          className={!isAnnual ? "font-bold" : "text-muted-foreground"}
        >
          Monthly
        </Label>
        <Switch id="billing-interval" checked={isAnnual} onCheckedChange={setIsAnnual} />
        <Label
          htmlFor="billing-interval"
          className={isAnnual ? "font-bold" : "text-muted-foreground"}
        >
          Annual <span className="text-primary ml-1 text-xs">(Save 17%)</span>
        </Label>
      </div>

      <div className="grid w-full max-w-5xl gap-8 px-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard
            key={plan.priceId}
            plan={plan}
            {...(currentPlan != null && { currentPlan })}
            {...(currentBillingCycle != null && { currentBillingCycle })}
            isLoading={isLoading === plan.priceId}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <ChangePlanDialog
        open={changePlanDialog.open}
        onOpenChange={(open) => setChangePlanDialog((prev) => ({ ...prev, open }))}
        plan={changePlanDialog.plan}
        planLabel={changePlanDialog.planLabel}
        isUpgrade={changePlanDialog.isUpgrade}
      />
    </div>
  );
}
