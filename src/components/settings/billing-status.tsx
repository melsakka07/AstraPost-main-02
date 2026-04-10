"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ManageSubscriptionButton } from "@/components/settings/manage-subscription-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();
  const [data, setData] = useState<BillingStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [undoingCancellation, setUndoingCancellation] = useState(false);

  const handleUndoCancellation = async () => {
    if (!data?.plan) return;

    setUndoingCancellation(true);
    try {
      // Call change-plan API with the current plan to reactivate
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: data.plan }),
      });

      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || "Failed to undo cancellation");
      }

      const result = await res.json();
      toast.success(result.message || "Cancellation undone successfully");

      // Refresh to show updated status
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to undo cancellation");
    } finally {
      setUndoingCancellation(false);
    }
  };

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d: BillingStatusData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="bg-muted h-5 w-36 animate-pulse rounded" />
        <div className="bg-muted h-4 w-52 animate-pulse rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-muted-foreground text-sm">
        Failed to load billing status.{" "}
        <button onClick={() => window.location.reload()} className="text-primary hover:underline">
          Refresh
        </button>
      </div>
    );
  }

  const { plan, status, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd } = data;
  const isTrialing = status === "trialing";
  const isPastDue = status === "past_due";
  const isCanceled = status === "cancelled";
  const isActive = status === "active";
  const isFree = status === "free";

  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const trialDaysLeft =
    trialEnd !== null ? Math.max(0, differenceInCalendarDays(trialEnd, new Date())) : null;

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
              trialDaysLeft <= 3 ? "font-medium text-amber-500" : "text-foreground font-medium"
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
        <div className="text-muted-foreground flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 flex-shrink-0" />
          Next billing date:{" "}
          <span className="text-foreground font-medium">{format(periodEnd, "MMM d, yyyy")}</span>
        </div>
      )}

      {/* Cancels at period end notice */}
      {cancelAtPeriodEnd && periodEnd && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-400">
          <p className="mb-3">
            Your subscription will be cancelled on{" "}
            <span className="font-medium">{format(periodEnd, "MMM d, yyyy")}</span>. You&apos;ll
            keep full access until then.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndoCancellation}
            disabled={undoingCancellation}
            className="border-amber-500/50 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
          >
            {undoingCancellation ? "Reactivating..." : "Undo Cancellation"}
          </Button>
        </div>
      )}

      {/* Past due warning */}
      {isPastDue && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive space-y-3 rounded-md border px-4 py-3">
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
