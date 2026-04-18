import { CheckCircle2, Clock, AlertCircle, X } from "lucide-react";
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
  const variant = p === "free" ? "secondary" : p === "agency" ? "outline" : "default";
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
  // Error/Failed state: Deleted, Banned, Suspended
  if (deletedAt)
    return (
      <Badge
        variant="destructive"
        className="flex w-fit items-center gap-1"
        title="User account has been deleted"
      >
        <X className="h-3 w-3" />
        Deleted
      </Badge>
    );
  if (bannedAt)
    return (
      <Badge
        variant="destructive"
        className="flex w-fit items-center gap-1"
        title="User account has been banned"
      >
        <AlertCircle className="h-3 w-3" />
        Banned
      </Badge>
    );
  if (isSuspended)
    return (
      <Badge
        variant="destructive"
        className="flex w-fit items-center gap-1"
        title="User account has been suspended"
      >
        <AlertCircle className="h-3 w-3" />
        Suspended
      </Badge>
    );
  // Pending state: Trial
  if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
    return (
      <Badge
        className="flex w-fit items-center gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400"
        variant="secondary"
        title="User is on a trial period"
      >
        <Clock className="h-3 w-3" />
        Trial
      </Badge>
    );
  }
  // Active state
  return (
    <Badge
      className="flex w-fit items-center gap-1 border-green-500/50 text-green-600 dark:text-green-400"
      variant="outline"
      title="User account is active"
    >
      <CheckCircle2 className="h-3 w-3" />
      Active
    </Badge>
  );
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;

  const config: Record<
    SubscriptionStatus,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: React.ReactNode;
      title: string;
    }
  > = {
    active: {
      variant: "default",
      icon: <CheckCircle2 className="h-3 w-3" />,
      title: "Subscription is active",
    },
    trialing: {
      variant: "secondary",
      icon: <Clock className="h-3 w-3" />,
      title: "Subscription is trialing",
    },
    past_due: {
      variant: "destructive",
      icon: <AlertCircle className="h-3 w-3" />,
      title: "Subscription payment is past due",
    },
    cancelled: {
      variant: "outline",
      icon: <X className="h-3 w-3" />,
      title: "Subscription has been cancelled",
    },
  };

  const { variant, icon, title } = config[status];
  return (
    <Badge variant={variant} className="flex w-fit items-center gap-1" title={title}>
      {icon}
      {status.replace("_", " ")}
    </Badge>
  );
}
