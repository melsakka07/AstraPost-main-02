"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface UsageData {
  plan: string;
  limits: {
    postsPerMonth: number | null;
    maxXAccounts: number | null;
    aiGenerationsPerMonth: number | null;
    aiImagesPerMonth: number | null;
  };
  usage: {
    posts: number;
    accounts: number;
    ai: number;
    aiImages: number;
  };
}

interface PostUsageBarProps {
  className?: string;
}

export function PostUsageBar({ className }: PostUsageBarProps) {
  const t = useTranslations("dashboard_shell");
  const [data, setData] = useState<UsageData | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    (async () => {
      // Retry up to 3 times with exponential backoff for dev-server race conditions
      for (let attempt = 0; attempt < 3; attempt++) {
        if (cancelled) return;
        try {
          const res = await fetchWithAuth("/api/billing/usage", { signal: controller.signal });
          if (res.ok) {
            const json = (await res.json()) as UsageData;
            if (!cancelled) setData(json);
            return; // Success
          }
          // 404/500 — retry if not last attempt
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
          }
        } catch {
          // Retry if not last attempt
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
          }
        }
      }
      // All retries exhausted — silently fail (non-critical UX enhancement)
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  if (!isMounted || !data) return null;

  const isFree = data.plan === "free";
  const postLimit = data.limits.postsPerMonth;
  const postsUsed = data.usage.posts;

  if (!isFree || postLimit === null) return null;

  const percentage = Math.min((postsUsed / postLimit) * 100, 100);
  const isNearLimit = percentage >= 80;

  if (!isNearLimit) return null;

  return (
    <UpgradeBanner
      className={className ?? ""}
      usagePercentage={percentage}
      usedAmount={postsUsed}
      limitAmount={postLimit}
      featureName={t("post_usage.feature_name")}
      translations={{
        used: t("post_usage.used"),
        of: t("post_usage.of"),
      }}
    />
  );
}
