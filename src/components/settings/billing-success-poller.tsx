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
    const abortRef = new AbortController();
    const timeoutId = setTimeout(() => abortRef.abort(), 8000); // 8s hard timeout
    let cancelled = false;

    const clearParam = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("billing");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    };

    const poll = async () => {
      if (cancelled) return;
      attemptsRef.current += 1;

      try {
        const res = await fetch("/api/billing/status", { signal: abortRef.signal });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { plan: string; status: string };
          // Only trigger success when the plan actually changed from initialPlan
          if (data.plan !== initialPlan && data.plan !== "free") {
            const label = PLAN_LABELS[data.plan] ?? data.plan;
            toast.success(`Welcome to ${label}! Your subscription is now active.`);
            clearParam();
            router.refresh();
            return;
          }
        }
      } catch (err) {
        if (abortRef.signal.aborted) return; // Aborted — cleanup will handle
        // silent — retry on next tick
      }

      if (cancelled) return;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        toast.info(
          "Your subscription is still being processed. This page will update shortly — please refresh in a moment."
        );
        clearParam();
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
      abortRef.abort();
      clearTimeout(timeoutId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [initialPlan, router]);

  return null;
}
