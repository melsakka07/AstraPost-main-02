"use client";

import { useEffect, useState } from "react";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";

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
  const [data, setData] = useState<UsageData | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    (async () => {
      try {
        const res = await fetch("/api/billing/usage", { signal: controller.signal });
        if (!res.ok) return;
        const json = (await res.json()) as UsageData;
        if (!cancelled) setData(json);
      } catch {
        // Silently fail — this is a non-critical UX enhancement
      } finally {
        clearTimeout(timeoutId);
      }
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
      featureName="Posts"
    />
  );
}
