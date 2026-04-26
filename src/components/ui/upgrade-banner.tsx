"use client";

import Link from "next/link";
import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UpgradeBannerProps {
  title?: string;
  description?: string;
  className?: string;
  usagePercentage?: number;
  usedAmount?: number;
  limitAmount?: number;
  featureName?: string;
  /** Translated text snippets for the limit warning messages */
  translations?: {
    used?: string;
    of?: string;
    limitReached?: string;
    runningLow?: string;
    upgradeToIncrease?: string;
    cta?: string;
  };
}

export function UpgradeBanner({
  title = "Unlock Unlimited Potential",
  description = "Upgrade to Pro to remove limits and access advanced AI features.",
  className,
  usagePercentage,
  usedAmount,
  limitAmount,
  featureName = "usage",
  translations,
}: UpgradeBannerProps) {
  const isNearLimit = usagePercentage !== undefined && usagePercentage >= 80;
  const isAtLimit = usagePercentage !== undefined && usagePercentage >= 100;

  const txt = {
    used: translations?.used ?? "used",
    of: translations?.of ?? "of",
    limitReached: translations?.limitReached ?? "limit reached",
    runningLow: translations?.runningLow ?? "Running low on",
    upgradeToIncrease: translations?.upgradeToIncrease ?? "Upgrade to increase your limits.",
  };

  return (
    <Card
      className={cn(
        "bg-gradient-to-r",
        isAtLimit
          ? "from-destructive/10 via-destructive/5 to-background border-destructive/30"
          : isNearLimit
            ? "to-background border-amber-500/30 from-amber-500/10 via-amber-500/5"
            : "from-primary/10 via-primary/5 to-background border-primary/20",
        className
      )}
    >
      <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
        <div className="flex flex-1 items-start gap-4 sm:items-center">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              isAtLimit
                ? "bg-destructive/20 text-destructive"
                : isNearLimit
                  ? "bg-amber-500/20 text-amber-500"
                  : "bg-primary/20 text-primary"
            )}
          >
            {isNearLimit || isAtLimit ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="space-y-1 text-left">
              <h3
                className={cn(
                  "font-semibold tracking-tight",
                  isAtLimit
                    ? "text-destructive"
                    : isNearLimit
                      ? "text-amber-600 dark:text-amber-500"
                      : ""
                )}
              >
                {isAtLimit
                  ? `${featureName} ${txt.limitReached}`
                  : isNearLimit
                    ? `${txt.runningLow} ${featureName.toLowerCase()}`
                    : title}
              </h3>
              <p className="text-muted-foreground max-w-[500px] text-sm">
                {isAtLimit || isNearLimit
                  ? `You've ${txt.used} ${usedAmount} ${txt.of} ${limitAmount} ${featureName.toLowerCase()}. ${txt.upgradeToIncrease}`
                  : description}
              </p>
            </div>

            {usagePercentage !== undefined && (
              <div className="max-w-[300px] space-y-1.5 pt-1">
                <Progress
                  value={usagePercentage}
                  className={cn(
                    "h-1.5",
                    isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""
                  )}
                />
              </div>
            )}
          </div>
        </div>
        <Button
          asChild
          variant={isAtLimit ? "destructive" : "default"}
          className={cn(
            isNearLimit && !isAtLimit ? "bg-amber-500 text-white hover:bg-amber-600" : ""
          )}
        >
          <Link href="/pricing">{translations?.cta ?? "Upgrade Now"}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
