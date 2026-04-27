"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { AlertCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface TrialBannerProps {
  trialEndsAt: Date | null;
  plan: string;
}

export function TrialBanner({ trialEndsAt, plan }: TrialBannerProps) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const t = useTranslations("trial_banner");

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
    () => false
  );

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
          <span>{t("expired")}</span>
          <Link href="/pricing" className="ml-2 underline hover:text-white/90">
            {t("upgrade_now")}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="ml-2 inline-flex items-center justify-center rounded p-1 hover:bg-black/10"
            aria-label={t("dismiss")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isUrgent
          ? "bg-amber-500 px-4 py-2 text-sm font-medium text-white"
          : "border-border bg-muted/60 text-foreground border-b px-4 py-2 text-sm font-medium"
      }
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>{daysLeft === 0 ? t("ending_today") : t("ending_in_days", { days: daysLeft })}</span>
        <Link
          href="/pricing"
          className={
            isUrgent
              ? "ml-2 underline hover:text-white/90"
              : "hover:text-foreground/80 ml-2 underline"
          }
        >
          {t("upgrade_to_pro")}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className={
            isUrgent
              ? "ml-2 inline-flex items-center justify-center rounded p-1 hover:bg-black/10"
              : "hover:bg-muted ml-2 inline-flex items-center justify-center rounded p-1"
          }
          aria-label={t("dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
