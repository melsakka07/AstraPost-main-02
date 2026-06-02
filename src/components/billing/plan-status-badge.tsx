"use client";

import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanStatusBadgeProps {
  /** effectivePlan: free | trial | pro_monthly | pro_annual | agency */
  plan: string;
  isTrialActive?: boolean;
  trialDaysLeft?: number | null;
  /** "past_due" | "cancelled" | "cancels_at_end" */
  subscriptionStatus?: string | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Shared, app-wide plan status badge. Pure presentational, client-safe (no server imports).
 * Render priority: past_due → cancels_at_end → trial → pro → agency → free.
 */
export function PlanStatusBadge({
  plan,
  isTrialActive,
  trialDaysLeft,
  subscriptionStatus,
  size = "md",
  className,
}: PlanStatusBadgeProps) {
  const t = useTranslations("plan_status");

  const isSm = size === "sm";
  const sizeClasses = cn("whitespace-nowrap", isSm ? "h-5 gap-0.5 px-1.5 text-[10px]" : "gap-1");
  const iconClass = isSm ? "h-2.5 w-2.5" : "h-3 w-3";

  // Past due — highest priority
  if (subscriptionStatus === "past_due") {
    return (
      <Badge variant="destructive" className={cn(sizeClasses, className)}>
        <AlertTriangle className={cn("me-1", iconClass)} />
        {t("past_due")}
      </Badge>
    );
  }

  // Cancels at period end
  if (subscriptionStatus === "cancels_at_end") {
    return (
      <Badge
        className={cn("border-warning-6 bg-warning-3 text-warning-11", sizeClasses, className)}
      >
        <XCircle className={cn("me-1", iconClass)} />
        {t("cancels_soon")}
      </Badge>
    );
  }

  // Trial active
  if (isTrialActive || plan === "trial") {
    const trialText =
      typeof trialDaysLeft === "number"
        ? `${t("trial")} · ${t("trial_days_left", { count: trialDaysLeft })}`
        : t("trial");
    return (
      <Badge className={cn("border-info-6 bg-info-3 text-info-11", sizeClasses, className)}>
        <Clock className={cn("me-1", iconClass)} />
        {trialText}
      </Badge>
    );
  }

  // Pro
  if (plan === "pro_monthly" || plan === "pro_annual") {
    return (
      <Badge
        className={cn("border-success-6 bg-success-3 text-success-11", sizeClasses, className)}
      >
        <CheckCircle2 className={cn("me-1", iconClass)} />
        {t("pro")}
      </Badge>
    );
  }

  // Agency
  if (plan === "agency") {
    return (
      <Badge className={cn("border-brand-6 bg-brand-3 text-brand-11", sizeClasses, className)}>
        <CheckCircle2 className={cn("me-1", iconClass)} />
        {t("agency")}
      </Badge>
    );
  }

  // Free — fallback
  return (
    <Badge variant="secondary" className={cn(sizeClasses, className)}>
      {t("free")}
    </Badge>
  );
}
