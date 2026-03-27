"use client";

import { useMemo, useState, useSyncExternalStore, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { AlertCircle, X } from "lucide-react";

interface TrialBannerProps {
  trialEndsAt: Date | null;
  plan: string;
}

export function TrialBanner({ trialEndsAt, plan }: TrialBannerProps) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const isDashboardRoute = pathname.startsWith("/dashboard");
  // Show when there is a trial end date (regardless of current plan).
  // Active Stripe trials set plan to the subscribed plan, not "free".
  const shouldShowForPlan = !!trialEndsAt;
  const bannerKey = useMemo(() => {
    if (!trialEndsAt) return null;
    return `trial-banner-dismissed:${trialEndsAt.toISOString().slice(0, 10)}`;
  }, [trialEndsAt]);

  // useSyncExternalStore handles SSR correctly: getServerSnapshot always
  // returns false (banner visible), getSnapshot reads sessionStorage on the
  // client. This avoids the typeof-window hydration mismatch.
  const dismissedByStorage = useSyncExternalStore(
    () => () => {},
    () => (bannerKey ? sessionStorage.getItem(bannerKey) === "1" : false),
    () => false,
  );

  if (!isMounted) return null;

  if (!isDashboardRoute || !shouldShowForPlan || !trialEndsAt) return null;
  if (dismissed || dismissedByStorage) return null;

  const trialEndDate = new Date(trialEndsAt);
  const daysLeftRaw = differenceInCalendarDays(trialEndDate, new Date());
  const daysLeft = Math.max(0, daysLeftRaw);
  const isExpired = daysLeftRaw < 0;
  const isUrgent = daysLeft <= 3;

  // Hide when trial expired and user is on a paid plan (they converted).
  if (isExpired && plan !== "free") return null;

  const dismiss = () => {
    if (!bannerKey) return;
    sessionStorage.setItem(bannerKey, "1");
    setDismissed(true);
  };
  
  if (isExpired) {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Your free trial has expired. Upgrade to continue using Pro features.</span>
          <Link href="/pricing" className="underline hover:text-white/90 ml-2">
            Upgrade Now
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="ml-2 inline-flex items-center justify-center rounded p-1 hover:bg-black/10"
            aria-label="Dismiss trial banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isUrgent ? "bg-amber-500 px-4 py-2 text-sm font-medium text-white" : "border-b border-border bg-muted/60 px-4 py-2 text-sm font-medium text-foreground"}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Your free trial ends in {daysLeft === 0 ? "today" : `${daysLeft} days`}.</span>
        <Link href="/pricing" className={isUrgent ? "ml-2 underline hover:text-white/90" : "ml-2 underline hover:text-foreground/80"}>
          Upgrade to Pro
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className={isUrgent ? "ml-2 inline-flex items-center justify-center rounded p-1 hover:bg-black/10" : "ml-2 inline-flex items-center justify-center rounded p-1 hover:bg-muted"}
          aria-label="Dismiss trial banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
