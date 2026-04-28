"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChangePlanDialog } from "@/components/billing/change-plan-dialog";
import { PricingCard, PricingPlan } from "@/components/billing/pricing-card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  const t = useTranslations("pricing");
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

  const monthlyPlans: PricingPlan[] = [
    {
      name: t("plan_free_name"),
      description: t("plan_free_desc"),
      price: "$0",
      interval: "month",
      features: [
        t("plan_free_feature_1"),
        t("plan_free_feature_2"),
        t("plan_free_feature_3"),
        t("plan_free_feature_4"),
        t("plan_free_feature_5"),
        t("plan_free_feature_6"),
        t("plan_free_feature_7"),
        t("plan_free_feature_8"),
      ],
      actionLabel: t("plan_free_action"),
      priceId: "free",
      popular: false,
    },
    {
      name: t("plan_pro_name"),
      description: t("plan_pro_desc"),
      price: "$29",
      interval: "month",
      features: [
        t("plan_pro_feature_1"),
        t("plan_pro_feature_2"),
        t("plan_pro_feature_3"),
        t("plan_pro_feature_4"),
        t("plan_pro_feature_5"),
        t("plan_pro_feature_6"),
        t("plan_pro_feature_7"),
        t("plan_pro_feature_8"),
        t("plan_pro_feature_9"),
        t("plan_pro_feature_10"),
        t("plan_pro_feature_11"),
        t("plan_pro_feature_12"),
        t("plan_pro_feature_13"),
        t("plan_pro_feature_14"),
        t("plan_pro_feature_15"),
      ],
      actionLabel: t("plan_pro_action"),
      priceId: "pro_monthly",
      popular: true,
    },
    {
      name: t("plan_agency_name"),
      description: t("plan_agency_desc"),
      price: "$99",
      interval: "month",
      features: [
        t("plan_agency_feature_1"),
        t("plan_agency_feature_2"),
        t("plan_agency_feature_3"),
        t("plan_agency_feature_4"),
        t("plan_agency_feature_5"),
        t("plan_agency_feature_6"),
        t("plan_agency_feature_7"),
      ],
      actionLabel: t("plan_agency_action"),
      priceId: "agency_monthly",
      popular: false,
    },
  ];

  const annualPlans: PricingPlan[] = [
    {
      name: t("plan_free_name"),
      description: t("plan_free_desc"),
      price: "$0",
      interval: "year",
      features: [
        t("plan_free_feature_1"),
        t("plan_free_feature_2"),
        t("plan_free_feature_3"),
        t("plan_free_feature_4"),
        t("plan_free_feature_5"),
        t("plan_free_feature_6"),
        t("plan_free_feature_7"),
        t("plan_free_feature_8"),
      ],
      actionLabel: t("plan_free_action"),
      priceId: "free",
      popular: false,
    },
    {
      name: t("plan_pro_name"),
      description: t("plan_pro_desc"),
      price: "$290",
      interval: "year",
      features: [
        t("plan_pro_feature_1"),
        t("plan_pro_annual_feature_2"),
        t("plan_pro_annual_feature_3"),
        t("plan_pro_feature_4"),
        t("plan_pro_feature_5"),
        t("plan_pro_feature_6"),
        t("plan_pro_feature_7"),
        t("plan_pro_feature_8"),
        t("plan_pro_feature_9"),
        t("plan_pro_feature_10"),
        t("plan_pro_feature_11"),
        t("plan_pro_feature_12"),
        t("plan_pro_feature_13"),
        t("plan_pro_feature_14"),
        t("plan_pro_feature_15"),
        t("plan_pro_annual_feature_16"),
        t("plan_pro_annual_feature_17"),
      ],
      actionLabel: t("plan_pro_action"),
      priceId: "pro_annual",
      popular: true,
      perMonthEquivalent: "~$24/mo",
      savingsPercent: 17,
    },
    {
      name: t("plan_agency_name"),
      description: t("plan_agency_desc"),
      price: "$990",
      interval: "year",
      features: [
        t("plan_agency_feature_1"),
        t("plan_agency_feature_2"),
        t("plan_agency_feature_3"),
        t("plan_agency_feature_4"),
        t("plan_agency_feature_5"),
        t("plan_agency_feature_6"),
        t("plan_agency_feature_7"),
        t("plan_agency_annual_feature_8"),
      ],
      actionLabel: t("plan_agency_action"),
      priceId: "agency_annual",
      popular: false,
      perMonthEquivalent: "~$83/mo",
      savingsPercent: 17,
    },
  ];

  const plans = isAnnual ? annualPlans : monthlyPlans;

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
          {t("toggle_monthly")}
        </Label>
        <Switch id="billing-interval" checked={isAnnual} onCheckedChange={setIsAnnual} />
        <Label
          htmlFor="billing-interval"
          className={isAnnual ? "font-bold" : "text-muted-foreground"}
        >
          {t("toggle_annual")}{" "}
          <span className="text-primary ml-1 text-xs">({t("toggle_save")})</span>
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
