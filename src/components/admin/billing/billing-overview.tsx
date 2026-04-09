"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CreditCard, DollarSign, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OverviewData {
  mrr: { cents: number; configured: boolean };
  subscriptions: {
    active: number;
    trialing: number;
    cancelledThisMonth: number;
    cancelledLastMonth: number;
  };
  users: { total: number; newThisMonth: number };
  planBreakdown: Record<string, { count: number; mrrCents: number }>;
  trialToPaidRate: number;
}

interface Transaction {
  id: string;
  plan: string | null;
  status: string | null;
  stripeSubscriptionId: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro_monthly: "Pro Monthly",
  pro_annual: "Pro Annual",
  agency: "Agency",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trialing: "secondary",
  past_due: "destructive",
  cancelled: "outline",
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
            <Icon className="text-primary h-4 w-4" />
          </div>
          {trend && (
            <span
              className={
                trend === "up"
                  ? "text-green-500"
                  : trend === "down"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }
            >
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : trend === "down" ? (
                <TrendingDown className="h-4 w-4" />
              ) : null}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-foreground text-sm font-medium">{label}</p>
          {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export function BillingOverview() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/billing/overview").then((r) => r.json()),
      fetch("/api/admin/billing/transactions").then((r) => r.json()),
    ])
      .then(([ov, tx]) => {
        setOverview(ov.data);
        setTransactions(tx.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!overview) return null;

  const { mrr, subscriptions: subs, users, planBreakdown, trialToPaidRate } = overview;

  const mrrDisplay = mrr.configured
    ? `$${(mrr.cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

  const churnDelta = subs.cancelledThisMonth - subs.cancelledLastMonth;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="MRR"
          value={mrrDisplay}
          {...(!mrr.configured && { sub: "Set DISPLAY_PRICE_* env vars" })}
          icon={DollarSign}
        />
        <StatCard
          label="Active subscriptions"
          value={subs.active}
          sub={`${subs.trialing} on trial`}
          icon={CreditCard}
          trend="neutral"
        />
        <StatCard
          label="Churned this month"
          value={subs.cancelledThisMonth}
          sub={
            churnDelta === 0
              ? "Same as last month"
              : `${Math.abs(churnDelta)} ${churnDelta > 0 ? "more" : "fewer"} than last month`
          }
          icon={churnDelta > 0 ? TrendingDown : TrendingUp}
          trend={churnDelta > 0 ? "down" : churnDelta < 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Trial → paid rate"
          value={`${trialToPaidRate}%`}
          sub={`${users.newThisMonth} new users this month`}
          icon={Users}
        />
      </div>

      {/* Plan breakdown */}
      {Object.keys(planBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(planBreakdown).map(([plan, { count, mrrCents }]) => (
                <div key={plan} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{PLAN_LABELS[plan] ?? plan}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{count}</p>
                  {mrr.configured && (
                    <p className="text-muted-foreground text-xs">
                      ${(mrrCents / 100).toFixed(0)}/mo
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent subscription events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscriber</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                    No subscription events yet
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.userName ?? "Unknown"}</span>
                        <span className="text-muted-foreground text-xs">{tx.userEmail ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {PLAN_LABELS[tx.plan ?? ""] ?? tx.plan ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[tx.status ?? ""] ?? "outline"}>
                        {tx.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(tx.updatedAt), "d MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
