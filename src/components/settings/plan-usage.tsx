"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

function getPercentage(used: number, limit: number | null) {
  if (limit === null || limit <= 0) {
    return 0;
  }
  return Math.min(100, (used / limit) * 100);
}

export function PlanUsage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload) {
          setData(payload as UsageData);
        }
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-muted-foreground mt-4 border-t pt-4 text-sm">
        Failed to load usage data.{" "}
        <button onClick={() => window.location.reload()} className="text-primary hover:underline">
          Refresh
        </button>
      </div>
    );
  }

  const { limits, usage, plan } = data;
  const postPercentage = getPercentage(usage.posts, limits.postsPerMonth);
  const accountPercentage = getPercentage(usage.accounts, limits.maxXAccounts);
  const aiPercentage = getPercentage(usage.ai, limits.aiGenerationsPerMonth);
  const imagePercentage = getPercentage(usage.aiImages, limits.aiImagesPerMonth);
  const highestPercentage = Math.max(
    postPercentage,
    accountPercentage,
    aiPercentage,
    imagePercentage
  );
  const showUpgradeCta = highestPercentage >= 70 && plan !== "agency";

  return (
    <div className="mt-4 space-y-6 border-t pt-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Posts this month</span>
          <span className="text-muted-foreground">
            {usage.posts} / {limits.postsPerMonth === null ? "Unlimited" : limits.postsPerMonth}
          </span>
        </div>
        <Progress value={postPercentage} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Connected X Accounts</span>
          <span className="text-muted-foreground">
            {usage.accounts} / {limits.maxXAccounts === null ? "Unlimited" : limits.maxXAccounts}
          </span>
        </div>
        <Progress value={accountPercentage} className="h-2" />
        {limits.maxXAccounts !== null && (
          <div className="text-xs">
            {usage.accounts < limits.maxXAccounts ? (
              <Link
                href="/dashboard/settings#accounts"
                className="text-primary cursor-pointer hover:underline"
              >
                {limits.maxXAccounts - usage.accounts} slot
                {limits.maxXAccounts - usage.accounts > 1 ? "s" : ""} available — add account
              </Link>
            ) : (
              <span className="text-muted-foreground">Account limit reached</span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>AI generations this month</span>
          <span className="text-muted-foreground">
            {usage.ai} /{" "}
            {limits.aiGenerationsPerMonth === null ? "Unlimited" : limits.aiGenerationsPerMonth}
          </span>
        </div>
        <Progress value={aiPercentage} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>AI images this month</span>
          <span className="text-muted-foreground">
            {usage.aiImages} /{" "}
            {limits.aiImagesPerMonth === null ? "Unlimited" : limits.aiImagesPerMonth}
          </span>
        </div>
        <Progress value={imagePercentage} className="h-2" />
      </div>

      {showUpgradeCta && (
        <UpgradeBanner
          usagePercentage={highestPercentage}
          usedAmount={
            highestPercentage === postPercentage
              ? usage.posts
              : highestPercentage === accountPercentage
                ? usage.accounts
                : highestPercentage === aiPercentage
                  ? usage.ai
                  : usage.aiImages
          }
          limitAmount={
            highestPercentage === postPercentage
              ? limits.postsPerMonth || 0
              : highestPercentage === accountPercentage
                ? limits.maxXAccounts || 0
                : highestPercentage === aiPercentage
                  ? limits.aiGenerationsPerMonth || 0
                  : limits.aiImagesPerMonth || 0
          }
          featureName={
            highestPercentage === postPercentage
              ? "Posts"
              : highestPercentage === accountPercentage
                ? "Accounts"
                : highestPercentage === aiPercentage
                  ? "AI generations"
                  : "AI images"
          }
        />
      )}
    </div>
  );
}
