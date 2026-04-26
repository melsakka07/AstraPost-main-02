"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings");
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
        {t("billing.plan_usage.load_error")}{" "}
        <button onClick={() => window.location.reload()} className="text-primary hover:underline">
          {t("billing.refresh")}
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

  const upgradeBannerTranslations = {
    used: t("billing.upgrade_banner.used"),
    of: t("billing.upgrade_banner.of"),
    limitReached: t("billing.upgrade_banner.limit_reached"),
    runningLow: t("billing.upgrade_banner.running_low"),
    upgradeToIncrease: t("billing.upgrade_banner.increase_limits"),
    cta: t("billing.upgrade_banner.cta"),
  };

  return (
    <div className="mt-4 space-y-6 border-t pt-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t("billing.plan_usage.posts")}</span>
          <span className="text-muted-foreground">
            {usage.posts} /{" "}
            {limits.postsPerMonth === null
              ? t("billing.plan_usage.unlimited")
              : limits.postsPerMonth}
          </span>
        </div>
        <Progress value={postPercentage} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t("billing.plan_usage.accounts")}</span>
          <span className="text-muted-foreground">
            {usage.accounts} /{" "}
            {limits.maxXAccounts === null ? t("billing.plan_usage.unlimited") : limits.maxXAccounts}
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
                {t("billing.plan_usage.slots_available", {
                  count: limits.maxXAccounts - usage.accounts,
                })}
              </Link>
            ) : (
              <span className="text-muted-foreground">
                {t("billing.plan_usage.account_limit_reached")}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t("billing.plan_usage.ai")}</span>
          <span className="text-muted-foreground">
            {usage.ai} /{" "}
            {limits.aiGenerationsPerMonth === null
              ? t("billing.plan_usage.unlimited")
              : limits.aiGenerationsPerMonth}
          </span>
        </div>
        <Progress value={aiPercentage} className="h-2" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t("billing.plan_usage.ai_images")}</span>
          <span className="text-muted-foreground">
            {usage.aiImages} /{" "}
            {limits.aiImagesPerMonth === null
              ? t("billing.plan_usage.unlimited")
              : limits.aiImagesPerMonth}
          </span>
        </div>
        <Progress value={imagePercentage} className="h-2" />
      </div>

      {showUpgradeCta && (
        <UpgradeBanner
          title={t("billing.upgrade_banner.title")}
          description={t("billing.upgrade_banner.description")}
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
              ? t("billing.plan_usage.posts")
              : highestPercentage === accountPercentage
                ? t("billing.plan_usage.accounts")
                : highestPercentage === aiPercentage
                  ? t("billing.plan_usage.ai")
                  : t("billing.plan_usage.ai_images")
          }
          translations={upgradeBannerTranslations}
        />
      )}
    </div>
  );
}
