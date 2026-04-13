"use client";

import { ImageIcon, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuotaBarProps {
  label: string;
  used: number;
  limit: number | "unlimited";
  percentage: number;
  icon: React.ElementType;
}

function QuotaBar({ label, used, limit, percentage, icon: Icon }: QuotaBarProps) {
  const colorClass =
    percentage < 50 ? "text-green-500" : percentage < 80 ? "text-yellow-500" : "text-red-500";
  const barColor =
    percentage < 50 ? "bg-green-500" : percentage < 80 ? "bg-yellow-500" : "bg-red-500";

  const displayText =
    limit === "unlimited" ? `${used} used this month` : `${used} of ${limit} used this month`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Icon className="text-muted-foreground h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{displayText}</span>
        {limit !== "unlimited" && (
          <span className={cn("font-semibold", colorClass)}>{percentage}%</span>
        )}
      </div>
      {limit !== "unlimited" && (
        <div className="relative">
          <Progress value={percentage} className="h-2" />
          <div
            className={cn(
              "absolute top-0 h-full rounded-full transition-all duration-300",
              barColor
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {percentage >= 80 && limit !== "unlimited" && (
        <p className="text-xs text-red-500 dark:text-red-400">
          Warning: Approaching usage limit. Consider upgrading plan.
        </p>
      )}
    </div>
  );
}

interface AiUsageProps {
  quota: {
    used: number;
    limit: number | "unlimited";
    percentage: number;
  };
  imageQuota: {
    used: number;
    limit: number | "unlimited";
    percentage: number;
  };
  plan: string;
}

export function AiUsageSection({ quota, imageQuota, plan }: AiUsageProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">AI Usage — {plan}</CardTitle>
        <Zap className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <QuotaBar
          label="AI Generations"
          used={quota.used}
          limit={quota.limit}
          percentage={quota.percentage}
          icon={Zap}
        />
        <QuotaBar
          label="Image Generations"
          used={imageQuota.used}
          limit={imageQuota.limit}
          percentage={imageQuota.percentage}
          icon={ImageIcon}
        />
      </CardContent>
    </Card>
  );
}
