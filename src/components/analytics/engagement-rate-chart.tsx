"use client";

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
}

export function EngagementRateChart({ data, className }: EngagementRateChartProps) {
  return (
    <Card className={cn("col-span-4", className)}>
      <CardHeader>
        <CardTitle>Engagement Rate</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="w-full">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
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
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
                    return (
                      <div className="bg-background rounded-lg border p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[0.70rem] uppercase">
                              Date
                            </span>
                            <span className="text-muted-foreground font-bold">
                              {new Date(label as string).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[0.70rem] uppercase">
                              Engagement Rate
                            </span>
                            <span className="font-bold">{payload[0].value}%</span>
                          </div>
                        </div>
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
