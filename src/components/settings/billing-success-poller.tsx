"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BillingSuccessPollerProps {
  /** The plan stored in DB at settings-page render time (before webhook fires). */
  initialPlan: string;
}

const PLAN_LABELS: Record<string, string> = {
  pro_monthly: "Pro",
  pro_annual: "Pro Annual",
  agency: "Agency",
  agency_monthly: "Agency",
  agency_annual: "Agency Annual",
};

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15; // 30 seconds total

/**
 * Invisible client component rendered when ?billing=success is present.
 * Polls GET /api/billing/status every 2 s for up to 30 s until the plan
 * changes from the initial value (webhook processed) then shows a success
 * toast, refreshes the page, and clears the query param.
 */
export function BillingSuccessPoller({ initialPlan }: BillingSuccessPollerProps) {
  const router = useRouter();
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearParam = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("billing");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    };

    const poll = async () => {
      attemptsRef.current += 1;

      try {
        const res = await fetch("/api/billing/status");
        if (res.ok) {
          const data = (await res.json()) as { plan: string; status: string };
          const planUpdated = data.plan !== "free" && data.plan !== initialPlan;
          // Also catch the case where initialPlan was already paid (upgrade scenario):
          // treat "active" status on any paid plan as confirmation.
          const isActiveNow = data.status === "active" || data.status === "trialing";

          if (planUpdated || (data.plan !== "free" && isActiveNow)) {
            const label = PLAN_LABELS[data.plan] ?? data.plan;
            toast.success(`Welcome to ${label}! Your subscription is now active.`);
            clearParam();
            router.refresh();
            return;
          }
        }
      } catch {
        // silent — retry on next tick
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        toast.info(
          "Your subscription is still being processed. This page will update shortly — please refresh in a moment.",
        );
        clearParam();
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    // Kick off immediately
    void poll();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
