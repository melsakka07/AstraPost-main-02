"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface MetricsChartsProps {
  data: {
    date: string;
    count: number;
  }[];
}

export function MetricsCharts({ data }: MetricsChartsProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="date"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
            itemStyle={{ color: 'var(--foreground)' }}
        />
        <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  );
}
