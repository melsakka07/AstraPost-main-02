"use client";

import { useMemo, useState } from "react";
import { GitCompare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EngagementRateChartProps {
  data: { date: string; value: number }[];
  className?: string;
  priorData?: { date: string; value: number }[];
  showComparison?: boolean;
}

export function EngagementRateChart({
  data,
  className,
  priorData,
  showComparison: initialComparison = false,
}: EngagementRateChartProps) {
  const locale = useLocale();
  const t = useTranslations("analytics");
  const hasPrior = priorData && priorData.length > 0;
  const [compareOn, setCompareOn] = useState(initialComparison && hasPrior);

  const mergedData = useMemo(() => {
    if (!compareOn || !hasPrior) return data;
    return data.map((point, i) => ({
      ...point,
      priorValue: priorData?.[i]?.value,
    }));
  }, [data, priorData, compareOn, hasPrior]);

  return (
    <Card className={cn("col-span-4", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("engagement_rate")}</CardTitle>
        {hasPrior && (
          <button
            type="button"
            onClick={() => setCompareOn((v) => !v)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
              "min-h-11 min-w-11 px-2",
              "hover:bg-accent hover:text-accent-foreground border",
              compareOn
                ? "bg-accent text-accent-foreground border-accent-foreground/20"
                : "bg-background text-muted-foreground border-input"
            )}
            aria-pressed={compareOn}
            aria-label={t("compare")}
          >
            <GitCompare className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t("compare")}</span>
          </button>
        )}
      </CardHeader>
      <CardContent className="ps-2">
        <div className="w-full">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={mergedData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
              }}
              aria-label="Engagement rate per day over the past 30 days"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
                }}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length && payload[0]) {
                    const currentVal = payload.find((p) => p.dataKey === "value");
                    const priorVal = payload.find((p) => p.dataKey === "priorValue");
                    return (
                      <div className="bg-background rounded-lg border p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[0.70rem] uppercase">
                              {t("date")}
                            </span>
                            <span className="text-muted-foreground font-bold">
                              {new Date(label as string).toLocaleDateString(locale)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[0.70rem] uppercase">
                              {t("engagement_rate")}
                            </span>
                            <span className="font-bold">
                              {currentVal?.value ?? payload[0].value}%
                            </span>
                          </div>
                        </div>
                        {priorVal && (
                          <div className="border-border mt-1 border-t pt-1">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-[0.65rem]">
                                {t("vs_prior_period")}
                              </span>
                              <span className="text-muted-foreground font-bold">
                                {priorVal.value}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              {compareOn && (
                <Line
                  type="monotone"
                  dataKey="priorValue"
                  stroke="hsl(var(--muted-foreground) / 0.5)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
