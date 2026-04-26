"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface BillingSuccessPollerProps {
  /** The plan stored in DB at settings-page render time (before webhook fires). */
  initialPlan: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15; // 30 seconds total

/**
 * Invisible client component rendered when ?billing=success is present.
 * Polls GET /api/billing/status every 2 s for up to 30 s until the plan
 * changes from the initial value (webhook processed) then shows a success
 * toast, refreshes the page, and clears the query param.
 */
export function BillingSuccessPoller({ initialPlan }: BillingSuccessPollerProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const planLabels: Record<string, string> = {
    pro_monthly: t("billing.plan_pro_monthly"),
    pro_annual: t("billing.plan_pro_annual"),
    agency: t("billing.plan_agency"),
    agency_monthly: t("billing.plan_agency"),
    agency_annual: t("billing.plan_agency"),
  };

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
            const label = planLabels[data.plan] ?? data.plan;
            toast.success(t("billing.welcome_success", { label }));
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
        toast.info(t("billing.processing_notice"));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- planLabels is derived from t which is stable
  }, [initialPlan, router, t]);

  return null;
}
