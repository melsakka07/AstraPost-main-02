"use client";

import { CheckCircle2, Clock, AlertCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { SubscriberPlan, SubscriptionStatus } from "./types";

export function PlanBadge({ plan }: { plan: SubscriberPlan | null }) {
  const t = useTranslations();
  const p = plan ?? "free";
  const planLabels: Record<SubscriberPlan, string> = {
    free: t("admin.plans.free"),
    pro_monthly: t("admin.plans.proMonthly"),
    pro_annual: t("admin.plans.proAnnual"),
    agency: t("admin.plans.agency"),
  };
  const variant = p === "free" ? "secondary" : p === "agency" ? "outline" : "default";
  return <Badge variant={variant}>{planLabels[p]}</Badge>;
}

export function StatusBadge({
  isSuspended,
  bannedAt,
  deletedAt,
  trialEndsAt,
}: {
  isSuspended: boolean | null;
  bannedAt: string | null;
  deletedAt: string | null;
  trialEndsAt: string | null;
}) {
  const t = useTranslations();
  // Error/Failed state: Deleted, Banned, Suspended
  if (deletedAt)
    return (
      <Badge
        variant="destructive"
        className="flex w-fit items-center gap-1"
        title={t("admin.subscribers.status.deletedTitle")}
      >
        <X className="h-3 w-3" />
        {t("admin.subscribers.status.deleted")}
      </Badge>
    );
  if (bannedAt)
    return (
      <Badge
        variant="destructive"
        className="flex w-fit items-center gap-1"
        title={t("admin.subscribers.status.bannedTitle")}
      >
        <AlertCircle className="h-3 w-3" />
        {t("admin.subscribers.status.banned")}
      </Badge>
    );
  if (isSuspended)
    return (
      <Badge
        variant="destructive"
        className="flex w-fit items-center gap-1"
        title={t("admin.subscribers.status.suspendedTitle")}
      >
        <AlertCircle className="h-3 w-3" />
        {t("admin.subscribers.status.suspended")}
      </Badge>
    );
  // Pending state: Trial
  if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
    return (
      <Badge
        className="border-warning-6/50 text-warning-11 flex w-fit items-center gap-1"
        variant="secondary"
        title={t("admin.subscribers.status.trialTitle")}
      >
        <Clock className="h-3 w-3" />
        {t("admin.subscribers.status.trial")}
      </Badge>
    );
  }
  // Active state
  return (
    <Badge
      className="border-success-6/50 text-success-11 flex w-fit items-center gap-1"
      variant="outline"
      title={t("admin.subscribers.status.activeTitle")}
    >
      <CheckCircle2 className="h-3 w-3" />
      {t("admin.subscribers.status.active")}
    </Badge>
  );
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus | null }) {
  const t = useTranslations();
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;

  const variant: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
    cancelled: "outline",
  };

  const icon: Record<SubscriptionStatus, React.ReactNode> = {
    active: <CheckCircle2 className="h-3 w-3" />,
    trialing: <Clock className="h-3 w-3" />,
    past_due: <AlertCircle className="h-3 w-3" />,
    cancelled: <X className="h-3 w-3" />,
  };

  /** Safe i18n lookup for subscription status labels. Falls back to a formatted string. */
  const safeStatusLabel = (s: SubscriptionStatus, suffix?: string): string => {
    const key = suffix
      ? `admin.subscribers.subscriptionStatus.${s}${suffix}`
      : `admin.subscribers.subscriptionStatus.${s}`;
    try {
      return t(key as never);
    } catch {
      return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
    }
  };

  return (
    <Badge
      variant={variant[status]}
      className="flex w-fit items-center gap-1"
      title={safeStatusLabel(status, "Title")}
    >
      {icon[status]}
      {safeStatusLabel(status)}
    </Badge>
  );
}
