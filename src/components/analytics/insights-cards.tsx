"use client";

import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface InsightItem {
  label: string;
  value: string;
  context?: string;
  trend: "positive" | "negative" | "neutral";
}

interface InsightsCardsProps {
  insights: InsightItem[];
  className?: string;
}

const trendIcon = (trend: "positive" | "negative" | "neutral") => {
  switch (trend) {
    case "positive":
      return <TrendingUp className="text-success-11 h-4 w-4 shrink-0" aria-hidden="true" />;
    case "negative":
      return <TrendingDown className="text-danger-11 h-4 w-4 shrink-0" aria-hidden="true" />;
    case "neutral":
      return <Lightbulb className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />;
  }
};

const trendTextColor = (trend: "positive" | "negative" | "neutral") => {
  switch (trend) {
    case "positive":
      return "text-success-11";
    case "negative":
      return "text-danger-11";
    case "neutral":
      return "text-foreground";
  }
};

export function InsightsCards({ insights, className }: InsightsCardsProps) {
  const t = useTranslations("analytics");

  if (!insights || insights.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-muted-foreground text-sm font-medium">{t("insights")}</h3>
      <div className="flex flex-row flex-wrap gap-3">
        {insights.map((insight) => (
          <div
            key={insight.label}
            className={cn(
              "bg-card flex min-w-[140px] flex-1 flex-col gap-1 rounded-lg border p-3",
              "min-h-[44px]"
            )}
          >
            <div className="flex items-center gap-2">
              {trendIcon(insight.trend)}
              <span className="text-muted-foreground text-xs">{insight.label}</span>
            </div>
            <span className={cn("text-lg font-bold", trendTextColor(insight.trend))}>
              {insight.value}
            </span>
            {insight.context && (
              <span className="text-muted-foreground text-[0.65rem]">{insight.context}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
