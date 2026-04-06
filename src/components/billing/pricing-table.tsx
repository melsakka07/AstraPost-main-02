"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    actionLabel: "Current Plan",
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
    actionLabel: "Current Plan",
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
      "2 Months Free",
    ],
    actionLabel: "Upgrade to Pro Annual",
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
    actionLabel: "Upgrade to Agency Annual",
    priceId: "agency_annual",
    popular: false,
    perMonthEquivalent: "~$83/mo",
    savingsPercent: 17,
  },
];

interface PricingTableProps {
  currentPlan?: string;
  hasBillingProfile?: boolean;
  isLoggedIn?: boolean;
}

export function PricingTable({ currentPlan, hasBillingProfile, isLoggedIn = false }: PricingTableProps) {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const plans = isAnnual ? ANNUAL_PLANS : MONTHLY_PLANS;

  const handleSelect = async (priceId: string) => {
    if (!isLoggedIn) {
        router.push(`/register?plan=${priceId}`);
        return;
    }

    if (priceId === "free") return; // Cannot downgrade automatically yet via this UI

    setIsLoading(priceId);

    try {
      if (hasBillingProfile) {
        // If they have billing profile, send them to portal usually, OR create checkout for upgrade
        // The API logic handles "subscription already exists" by suggesting portal.
        // Let's try creating checkout first. If error 409, we redirect to portal.
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: priceId }),
      });

      const data = await res.json();

      if (res.status === 409 && data.code === "existing_subscription") {
         toast.info("Redirecting to billing portal to manage subscription...");
         // Redirect to portal
         const portalRes = await fetch("/api/billing/portal", { method: "POST" });
         const portalData = await portalRes.json();
         if (portalData.url) window.location.href = portalData.url;
         else throw new Error("Failed to get portal URL");
         return;
      }

      if (!res.ok) throw new Error(data.error || "Failed to start checkout");

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
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex items-center gap-4">
        <Label htmlFor="billing-interval" className={!isAnnual ? "font-bold" : "text-muted-foreground"}>Monthly</Label>
        <Switch 
            id="billing-interval" 
            checked={isAnnual} 
            onCheckedChange={setIsAnnual} 
        />
        <Label htmlFor="billing-interval" className={isAnnual ? "font-bold" : "text-muted-foreground"}>
            Annual <span className="text-xs text-primary ml-1">(Save 17%)</span>
        </Label>
      </div>

      <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl px-4">
        {plans.map((plan) => (
            <PricingCard
                key={plan.priceId}
                plan={plan}
                {...(currentPlan != null && { currentPlan })}
                isLoading={isLoading === plan.priceId}
                onSelect={handleSelect}
                isAnnual={isAnnual}
            />
        ))}
      </div>
    </div>
  );
}
