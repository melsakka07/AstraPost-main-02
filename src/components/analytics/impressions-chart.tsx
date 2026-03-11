"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImpressionsChartProps {
  data: { date: string; value: number }[];
  className?: string;
}

export function ImpressionsChart({ data, className }: ImpressionsChartProps) {
  return (
    <Card className={cn("col-span-4", className)}>
      <CardHeader>
        <CardTitle>Impressions</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
              }}
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
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload, label }) => {
                    if (active && payload && payload.length && payload[0]) {
                    return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Date
                            </span>
                            <span className="font-bold text-muted-foreground">
                                {new Date(label as string).toLocaleDateString()}
                            </span>
                            </div>
                            <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Impressions
                            </span>
                            <span className="font-bold">
                                {payload[0].value}
                            </span>
                            </div>
                        </div>
                        </div>
                    );
                    }
                    return null;
                }}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
