import { Badge } from "@/components/ui/badge";
import type { SubscriberPlan, SubscriptionStatus } from "./types";

const PLAN_LABELS: Record<SubscriberPlan, string> = {
  free: "Free",
  pro_monthly: "Pro Monthly",
  pro_annual: "Pro Annual",
  agency: "Agency",
};

export function PlanBadge({ plan }: { plan: SubscriberPlan | null }) {
  const p = plan ?? "free";
  const variant =
    p === "free" ? "secondary"
    : p === "agency" ? "outline"
    : "default";
  return <Badge variant={variant}>{PLAN_LABELS[p]}</Badge>;
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
  if (deletedAt) return <Badge variant="destructive">Deleted</Badge>;
  if (bannedAt) return <Badge variant="destructive">Banned</Badge>;
  if (isSuspended) return <Badge variant="destructive">Suspended</Badge>;
  if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
    return <Badge variant="secondary" className="border-amber-500/50 text-amber-600 dark:text-amber-400">Trial</Badge>;
  }
  return <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">Active</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const variants: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
    cancelled: "outline",
  };
  return <Badge variant={variants[status]}>{status.replace("_", " ")}</Badge>;
}
