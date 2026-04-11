"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MRRTrendPoint {
  month: string;
  mrr: number;
  proMonthly: number;
  proAnnual: number;
  agency: number;
}

interface LTVEstimate {
  plan: string;
  monthlyPrice: number;
  avgMonths: number;
  ltv: number;
}

interface CohortRow {
  cohort: string;
  totalUsers: number;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
}

/**
 * Formats price in cents to USD currency string
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Formats price in cents to USD with K suffix for thousands
 */
function formatMRRTooltip(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(2)}`;
}

export function MRRTrendChart({ mrrTrends }: { mrrTrends: MRRTrendPoint[] }) {
  if (!mrrTrends || mrrTrends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Recurring Revenue (MRR) Trend</CardTitle>
          <CardDescription>12-month revenue trend by plan type</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data: convert cents to dollars for display
  const chartData = mrrTrends.map((point) => ({
    ...point,
    mrrDisplay: point.mrr / 100,
    proMonthlyDisplay: point.proMonthly / 100,
    proAnnualDisplay: point.proAnnual / 100,
    agencyDisplay: point.agency / 100,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Recurring Revenue (MRR) Trend</CardTitle>
        <CardDescription>12-month revenue trend by plan type</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fill: "currentColor" }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fill: "currentColor" }}
              className="text-muted-foreground"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: unknown) => {
                if (typeof value === "number") {
                  return formatMRRTooltip(value * 100);
                }
                return "";
              }}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Line
              type="monotone"
              dataKey="mrrDisplay"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Total MRR"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="proMonthlyDisplay"
              stroke="hsl(var(--primary) / 0.6)"
              strokeWidth={1.5}
              name="Pro Monthly"
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="proAnnualDisplay"
              stroke="hsl(var(--primary) / 0.4)"
              strokeWidth={1.5}
              name="Pro Annual"
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="agencyDisplay"
              stroke="hsl(var(--accent))"
              strokeWidth={1.5}
              name="Agency"
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LTVEstimatesTable({ ltvEstimates }: { ltvEstimates: Record<string, LTVEstimate> }) {
  const plans = Object.values(ltvEstimates);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifetime Value (LTV) Estimates</CardTitle>
        <CardDescription>
          LTV calculated as monthly price × average customer lifetime (baseline 12 months)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-3 text-left font-medium">Plan</th>
                <th className="p-3 text-right font-medium">Monthly Price</th>
                <th className="p-3 text-right font-medium">Avg. Lifetime</th>
                <th className="p-3 text-right font-medium">LTV Estimate</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((est) => (
                <tr key={est.plan} className="border-b last:border-0">
                  <td className="p-3 font-medium">{est.plan}</td>
                  <td className="p-3 text-right">{formatCurrency(est.monthlyPrice)}</td>
                  <td className="p-3 text-right">{est.avgMonths} months</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(est.ltv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function CohortRetentionTable({ cohortData }: { cohortData: CohortRow[] }) {
  if (!cohortData || cohortData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention Analysis</CardTitle>
          <CardDescription>% of users from each signup month still on paid plans</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cohort Retention Analysis</CardTitle>
        <CardDescription>% of users from each signup month still on paid plans</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-3 text-left font-medium">Cohort (Signup Month)</th>
                <th className="p-3 text-right font-medium">Total Users</th>
                <th className="p-3 text-right font-medium">Month 0</th>
                <th className="p-3 text-right font-medium">Month +1</th>
                <th className="p-3 text-right font-medium">Month +2</th>
                <th className="p-3 text-right font-medium">Month +3</th>
                <th className="p-3 text-right font-medium">Month +6</th>
              </tr>
            </thead>
            <tbody>
              {cohortData.map((row) => (
                <tr key={row.cohort} className="border-b last:border-0">
                  <td className="p-3 font-medium">{row.cohort}</td>
                  <td className="p-3 text-right">{row.totalUsers}</td>
                  <RetentionCell percentage={row.month0} />
                  <RetentionCell percentage={row.month1} />
                  <RetentionCell percentage={row.month2} />
                  <RetentionCell percentage={row.month3} />
                  <RetentionCell percentage={row.month6} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Retention cell with color coding: green for high retention, yellow for medium, red for low
 */
function RetentionCell({ percentage }: { percentage: number }) {
  let bgColor = "bg-background";
  let textColor = "text-foreground";

  if (percentage >= 75) {
    bgColor = "bg-green-500/10";
    textColor = "text-green-700 dark:text-green-400";
  } else if (percentage >= 50) {
    bgColor = "bg-yellow-500/10";
    textColor = "text-yellow-700 dark:text-yellow-400";
  } else if (percentage > 0) {
    bgColor = "bg-red-500/10";
    textColor = "text-red-700 dark:text-red-400";
  }

  return (
    <td className={`p-3 text-right font-medium ${bgColor}`}>
      <span className={textColor}>{percentage}%</span>
    </td>
  );
}
