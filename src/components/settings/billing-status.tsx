"use client";

import { useEffect, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, XCircle } from "lucide-react";
import { ManageSubscriptionButton } from "@/components/settings/manage-subscription-button";
import { Badge } from "@/components/ui/badge";

interface BillingStatusData {
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  stripeCustomerId: string | null;
}

/**
 * Displays live subscription lifecycle details fetched from GET /api/billing/status.
 * Shown inside the Subscription card on the settings page.
 */
export function BillingStatus() {
  const [data, setData] = useState<BillingStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d: BillingStatusData) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-5 w-36 rounded animate-pulse bg-muted" />
        <div className="h-4 w-52 rounded animate-pulse bg-muted" />
      </div>
    );
  }
  if (!data) return null;

  const { plan, status, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd } = data;
  const isTrialing = status === "trialing";
  const isPastDue = status === "past_due";
  const isCanceled = status === "cancelled";
  const isActive = status === "active";
  const isFree = status === "free";

  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const trialDaysLeft =
    trialEnd !== null
      ? Math.max(0, differenceInCalendarDays(trialEnd, new Date()))
      : null;

  return (
    <div className="space-y-3 text-sm">
      {/* Status badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">Status:</span>
        {isActive && !cancelAtPeriodEnd && (
          <Badge className="border-green-500/20 bg-green-500/15 text-green-600 dark:text-green-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Active
          </Badge>
        )}
        {isTrialing && (
          <Badge className="border-blue-500/20 bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Clock className="mr-1 h-3 w-3" />
            Free Trial
          </Badge>
        )}
        {isPastDue && (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Past Due
          </Badge>
        )}
        {isCanceled && (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Canceled
          </Badge>
        )}
        {cancelAtPeriodEnd && isActive && (
          <Badge className="border-amber-500/20 bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <XCircle className="mr-1 h-3 w-3" />
            Cancels at Period End
          </Badge>
        )}
        {isFree && plan === "free" && <Badge variant="secondary">Free</Badge>}
      </div>

      {/* Trial countdown */}
      {isTrialing && trialEnd && trialDaysLeft !== null && (
        <p className="text-muted-foreground">
          Free trial ends{" "}
          <span
            className={
              trialDaysLeft <= 3
                ? "font-medium text-amber-500"
                : "font-medium text-foreground"
            }
          >
            {trialDaysLeft === 0
              ? "today"
              : trialDaysLeft === 1
                ? "tomorrow"
                : `in ${trialDaysLeft} days`}
          </span>{" "}
          ({format(trialEnd, "MMM d, yyyy")}).
        </p>
      )}

      {/* Next billing date (active, not cancelling) */}
      {isActive && !cancelAtPeriodEnd && periodEnd && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-4 w-4 flex-shrink-0" />
          Next billing date:{" "}
          <span className="font-medium text-foreground">
            {format(periodEnd, "MMM d, yyyy")}
          </span>
        </div>
      )}

      {/* Cancels at period end notice */}
      {cancelAtPeriodEnd && periodEnd && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-400">
          Your subscription will be cancelled on{" "}
          <span className="font-medium">{format(periodEnd, "MMM d, yyyy")}</span>.
          You&apos;ll keep full access until then. You can reactivate anytime via
          the billing portal.
        </div>
      )}

      {/* Past due warning */}
      {isPastDue && (
        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Payment failed — your account is past due.
          </p>
          <p className="text-sm">
            Update your payment method to avoid losing access to your features.
          </p>
          <ManageSubscriptionButton />
        </div>
      )}
    </div>
  );
}
