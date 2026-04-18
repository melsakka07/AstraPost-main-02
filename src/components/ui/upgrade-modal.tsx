"use client";

import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const t = useTranslations("upgrade_modal");

  const featureLabel =
    context?.feature === "ai_writer" || context?.feature === "ai_quota"
      ? t("ai_generation")
      : context?.feature === "scheduled_posts"
        ? t("scheduled_posts")
        : context?.feature === "x_accounts"
          ? t("connected_x_accounts")
          : context?.feature === "analytics_export"
            ? t("analytics_export")
            : t("plan_limits");

  const suggestedPlanLabel =
    context?.suggestedPlan === "agency"
      ? t("agency")
      : context?.suggestedPlan === "pro_annual" || context?.suggestedPlan === "pro_monthly"
        ? t("pro")
        : t("pro");

  const title =
    context?.feature === "x_accounts"
      ? t("increase_capacity")
      : context?.feature === "analytics_export"
        ? t("unlock_export")
        : t("unlock_pro");

  const usageText =
    typeof context?.limit === "number" && typeof context?.used === "number"
      ? `${context.used}/${context.limit} used`
      : null;
  const remainingText =
    typeof context?.remaining === "number" ? `${context.remaining} remaining` : null;
  const trialContextText = context?.trialActive ? "You are currently on trial." : null;
  const ctaPlanLabel =
    context?.suggestedPlan === "agency" ? t("upgrade_to_agency") : t("upgrade_to_pro");
  const description =
    context?.message ||
    t("upgrade_description", { feature: featureLabel, plan: suggestedPlanLabel });
  const metaLine = [usageText, remainingText, trialContextText].filter(Boolean).join(" • ");
  const ctaHref =
    context?.upgradeUrl && context.upgradeUrl.startsWith("/") ? context.upgradeUrl : "/pricing";
  const planFeatures =
    context?.suggestedPlan === "agency"
      ? [
          t("feature_agency_1"),
          t("feature_agency_2"),
          t("feature_agency_3"),
          t("feature_agency_4"),
          t("feature_agency_5"),
        ]
      : [
          t("feature_pro_1"),
          t("feature_pro_2"),
          t("feature_pro_3"),
          t("feature_pro_4"),
          t("feature_pro_5"),
        ];

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="text-primary h-5 w-5" />
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
                <div className="bg-primary/10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="text-primary h-3 w-3" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full py-6 text-lg"
            size="lg"
            onClick={() => {
              close();
              router.push(ctaHref);
            }}
          >
            {ctaPlanLabel}
          </Button>
          <Button variant="ghost" onClick={close} className="w-full">
            {t("maybe_later")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
