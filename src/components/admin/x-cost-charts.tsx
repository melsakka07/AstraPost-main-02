"use client";

import { Activity, AlertTriangle, BarChart3, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DailyXSpend,
  TeamXSpend,
  XActionBreakdown,
  TopXSpender,
} from "@/lib/services/admin-x-metrics";

const ACTION_LABELS: Record<string, string> = {
  post: "Post",
  post_url: "Post (URL)",
  read_owned: "Owned Read",
  read_third: "3rd-Party Read",
  user_lookup: "User Lookup",
  trends: "Trends",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function microToDollars(micro: number): number {
  return micro / 10000;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface XCostDashboardProps {
  dailyXSpend7: DailyXSpend[];
  dailyXSpend30: DailyXSpend[];
  todaySpendMicro: number;
  totalSpendMicro30: number;
  teamBudgets: TeamXSpend[];
  actionBreakdown: XActionBreakdown[];
  topSpenders: TopXSpender[];
}

// ── Usage Bar Chart ────────────────────────────────────────────────────────────

function XSpendBarChart({ data }: { data: DailyXSpend[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">7-Day Spend Trend</CardTitle>
          <CardDescription>No data available for this period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxDollars = Math.max(...data.map((d) => microToDollars(d.costMicro)), 0.01);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">7-Day Spend Trend</CardTitle>
        <CardDescription>Daily X API spend (dollars)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-1">
          {data.map((d) => {
            const dollars = microToDollars(d.costMicro);
            const heightPct = Math.max((dollars / maxDollars) * 100, 2);
            return (
              <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-muted-foreground text-xs tabular-nums">
                  {dollars > 0 ? `$${dollars.toFixed(2)}` : "$0"}
                </span>
                <div
                  className="bg-brand-9 hover:bg-brand-10 w-full rounded-t transition-colors"
                  style={{ height: `${heightPct}%` }}
                  title={`${d.date}: $${dollars.toFixed(2)} (${d.count} calls)`}
                />
                <span className="text-muted-foreground w-full truncate text-center text-[10px]">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Team Budget Table ──────────────────────────────────────────────────────────

function TeamBudgetTable({ data }: { data: TeamXSpend[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Per-Team Budget (30 days)</CardTitle>
        <CardDescription>Monthly budget consumption vs limit</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No team budget data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-end">Spent</TableHead>
                  <TableHead className="text-end">Limit</TableHead>
                  <TableHead className="w-32">Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const spent = microToDollars(row.usedMicro);
                  const limit = microToDollars(row.limitMicro);
                  const barColor =
                    row.pctUsed >= 80
                      ? "bg-destructive"
                      : row.pctUsed >= 50
                        ? "bg-warning-9"
                        : "bg-success-9";
                  return (
                    <TableRow key={row.teamId}>
                      <TableCell className="font-medium">{row.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.plan ?? "unknown"}</Badge>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">${spent.toFixed(2)}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {row.limitMicro === -1
                          ? "Unlimited"
                          : row.limitMicro === 0
                            ? "—"
                            : `$${limit.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                            <div
                              className={`${barColor} h-full rounded-full`}
                              style={{ width: `${Math.min(row.pctUsed, 100)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground text-endtext-xs w-9 tabular-nums">
                            {row.pctUsed}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Action Breakdown Table ─────────────────────────────────────────────────────

function ActionBreakdownTable({ data }: { data: XActionBreakdown[] }) {
  const totalMicro = data.reduce((sum, d) => sum + d.costMicro, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spend by Action (30 days)</CardTitle>
        <CardDescription>Cost breakdown per X API action</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No usage data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-end">Cost</TableHead>
                  <TableHead className="text-end">Count</TableHead>
                  <TableHead className="w-24">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const share = totalMicro > 0 ? (row.costMicro / totalMicro) * 100 : 0;
                  return (
                    <TableRow key={row.action}>
                      <TableCell className="font-medium">
                        <Badge variant="secondary">{actionLabel(row.action)}</Badge>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        ${microToDollars(row.costMicro).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {row.count.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                            <div
                              className="bg-brand-9 h-full rounded-full"
                              style={{ width: `${Math.min(share, 100)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground text-endtext-xs w-9 tabular-nums">
                            {Math.round(share)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Top Spenders Table ─────────────────────────────────────────────────────────

function TopXSpendersTable({ data }: { data: TopXSpender[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Spenders (30 days)</CardTitle>
        <CardDescription>Teams ranked by total X API cost</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No usage data available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead className="text-end">Total Cost</TableHead>
                <TableHead className="text-end">API Calls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.teamId}>
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell className="text-success-11 text-endfont-medium tabular-nums">
                    ${microToDollars(row.costMicro).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {row.count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard Component ───────────────────────────────────────────────────

export function XCostDashboard({
  dailyXSpend7,
  dailyXSpend30,
  todaySpendMicro,
  totalSpendMicro30,
  teamBudgets,
  actionBreakdown,
  topSpenders,
}: XCostDashboardProps) {
  const todayDollars = microToDollars(todaySpendMicro).toFixed(2);
  const totalDollars30 = microToDollars(totalSpendMicro30).toFixed(2);
  const totalCalls30 = dailyXSpend30.reduce((sum, d) => sum + d.count, 0);
  const teamsAtRisk = teamBudgets.filter((t) => t.pctUsed >= 80).length;

  return (
    <>
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Spend"
          value={`$${todayDollars}`}
          icon={BarChart3}
          variant="success"
          description="Total X API spend today"
        />
        <StatCard
          title="30-Day Spend"
          value={`$${totalDollars30}`}
          icon={Activity}
          variant="default"
          description={`${totalCalls30.toLocaleString()} API calls`}
        />
        <StatCard
          title="Teams at Risk"
          value={teamsAtRisk}
          icon={AlertTriangle}
          variant={teamsAtRisk > 0 ? "destructive" : "warning"}
          description="≥80% of monthly budget"
        />
        <StatCard
          title="Total API Calls"
          value={totalCalls30.toLocaleString()}
          icon={Hash}
          variant="default"
          description="30-day X API request count"
        />
      </div>

      {/* 7-Day Trend */}
      <XSpendBarChart data={dailyXSpend7} />

      {/* Tables: 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TeamBudgetTable data={teamBudgets} />
        <ActionBreakdownTable data={actionBreakdown} />
      </div>

      <TopXSpendersTable data={topSpenders} />
    </>
  );
}
