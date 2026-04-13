"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
  const isNearLimit = postsUsed >= postLimit * 0.8;
  const isAtLimit = postsUsed >= postLimit;

  return (
    <Alert
      className={cn(
        "border-dashed",
        isAtLimit
          ? "border-destructive/50 bg-destructive/5"
          : isNearLimit
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-muted-foreground/30 bg-muted/30",
        className
      )}
    >
      <AlertCircle
        className={cn(
          "shrink-0",
          isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-muted-foreground"
        )}
      />
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {isAtLimit
                ? "Post limit reached"
                : `You've used ${postsUsed} of ${postLimit} posts this month`}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                isAtLimit
                  ? "text-destructive"
                  : isNearLimit
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              )}
            >
              {postsUsed}/{postLimit}
            </span>
          </div>
          <Progress
            value={percentage}
            className={cn(
              "h-1.5",
              isAtLimit
                ? "[&>[data-slot=progress-indicator]]:bg-destructive"
                : isNearLimit
                  ? "[&>[data-slot=progress-indicator]]:bg-amber-500"
                  : ""
            )}
          />
        </div>
        <Link
          href="/pricing"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Upgrade
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </AlertDescription>
    </Alert>
  );
}
