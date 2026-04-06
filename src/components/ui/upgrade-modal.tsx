"use client";

import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UpgradeContext {
  error?: string | undefined;
  code?: string | undefined;
  feature?: string | undefined;
  message?: string | undefined;
  plan?: string | undefined;
  limit?: number | null | undefined;
  used?: number | undefined;
  remaining?: number | null | undefined;
  upgradeUrl?: string | undefined;
  suggestedPlan?: string | undefined;
  trialActive?: boolean | undefined;
  resetAt?: string | null | undefined;
}

interface UpgradeModalStore {
  isOpen: boolean;
  context: UpgradeContext | null;
  open: () => void;
  openWithContext: (context: UpgradeContext) => void;
  close: () => void;
}

export const useUpgradeModal = create<UpgradeModalStore>((set) => ({
  isOpen: false,
  context: null,
  open: () => set({ isOpen: true }),
  openWithContext: (context) => set({ isOpen: true, context }),
  close: () => set({ isOpen: false, context: null }),
}));

export function UpgradeModal() {
  const { isOpen, context, close } = useUpgradeModal();
  const router = useRouter();
  const featureLabel =
    context?.feature === "ai_writer" || context?.feature === "ai_quota"
      ? "AI generation"
      : context?.feature === "scheduled_posts"
      ? "scheduled posts"
      : context?.feature === "x_accounts"
      ? "connected X accounts"
      : context?.feature === "analytics_export"
      ? "analytics export"
      : "plan limits";

  const suggestedPlanLabel =
    context?.suggestedPlan === "agency"
      ? "Agency"
      : context?.suggestedPlan === "pro_annual" || context?.suggestedPlan === "pro_monthly"
      ? "Pro"
      : "Pro";

  const title =
    context?.feature === "x_accounts"
      ? "Increase Account Capacity"
      : context?.feature === "analytics_export"
      ? "Unlock Export Access"
      : "Unlock Pro Features";

  const usageText =
    typeof context?.limit === "number" && typeof context?.used === "number"
      ? `${context.used}/${context.limit} used`
      : null;
  const remainingText =
    typeof context?.remaining === "number"
      ? `${context.remaining} remaining`
      : null;
  const trialContextText = context?.trialActive
    ? "You are currently on trial."
    : null;
  const ctaPlanLabel =
    context?.suggestedPlan === "agency"
      ? "Upgrade to Agency"
      : "Upgrade to Pro";
  const description =
    context?.message ||
    `You reached the ${featureLabel} limit on your current plan. Upgrade to ${suggestedPlanLabel} to continue.`;
  const metaLine = [usageText, remainingText, trialContextText].filter(Boolean).join(" • ");
  const ctaHref =
    context?.upgradeUrl && context.upgradeUrl.startsWith("/")
      ? context.upgradeUrl
      : "/pricing";
  const planFeatures =
    context?.suggestedPlan === "agency"
      ? [
          "Connect up to 10 X accounts",
          "Higher AI capacity for teams",
          "White-label reports",
          "Team members support",
          "Dedicated account manager",
        ]
      : [
          "Unlimited AI generations",
          "Unlimited posts per month",
          "Connect up to 3 X accounts",
          "Advanced analytics",
          "Priority support",
        ];

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            {metaLine ? ` (${metaLine})` : ""}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            {planFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full text-lg py-6"
            size="lg"
            onClick={() => {
              close();
              router.push(ctaHref);
            }}
          >
            {ctaPlanLabel}
          </Button>
          <Button variant="ghost" onClick={close} className="w-full">
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
