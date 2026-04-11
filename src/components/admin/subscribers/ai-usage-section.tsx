"use client";

import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AiUsageProps {
  quota: {
    used: number;
    limit: number | "unlimited";
    percentage: number;
  };
  plan: string;
}

export function AiUsageSection({ quota, plan }: AiUsageProps) {
  const getPercentageColor = (percentage: number) => {
    if (percentage < 50) return "text-green-500";
    if (percentage < 80) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const displayText =
    quota.limit === "unlimited"
      ? `${quota.used} used this month`
      : `${quota.used} of ${quota.limit} used this month`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">AI Usage - {plan}</CardTitle>
        <Zap className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{displayText}</span>
            <span className={cn("font-semibold", getPercentageColor(quota.percentage))}>
              {quota.percentage}%
            </span>
          </div>
          {quota.limit !== "unlimited" && (
            <div className="relative">
              <Progress value={quota.percentage} className="h-2" />
              <div
                className={cn(
                  "absolute top-0 h-full rounded-full transition-all duration-300",
                  getProgressColor(quota.percentage)
                )}
                style={{ width: `${quota.percentage}%` }}
              />
            </div>
          )}
          {quota.percentage >= 80 && quota.limit !== "unlimited" && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">
              Warning: Approaching usage limit. Consider upgrading plan.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
