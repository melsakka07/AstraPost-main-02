"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
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
import { useAdminPolling } from "../use-admin-polling";

interface AffiliateLeaderboardRow {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  clicksThisMonth: number;
  conversions: number;
  conversionRate: number;
  earningsCents: number;
}

type SortField = "clicks" | "conversions" | "rate" | "earnings";
type SortOrder = "asc" | "desc";

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Affiliates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface AffiliateLeaderboardProps {
  initialData?: AffiliateLeaderboardRow[] | null;
}

export function AffiliateLeaderboard({ initialData }: AffiliateLeaderboardProps = {}) {
  const [sortField, setSortField] = useState<SortField>("earnings");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data, loading } = useAdminPolling<AffiliateLeaderboardRow[]>({
    fetchFn: async (signal) => {
      const r = await fetch("/api/admin/affiliate/leaderboard", { signal });
      if (!r.ok) throw new Error("Failed to fetch affiliate leaderboard");
      const json = await r.json();
      return json.data ?? [];
    },
    intervalMs: 60_000,
    ...(initialData !== undefined && { initialData }),
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedData = [...(data ?? [])].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortField) {
      case "clicks":
        aVal = a.clicksThisMonth;
        bVal = b.clicksThisMonth;
        break;
      case "conversions":
        aVal = a.conversions;
        bVal = b.conversions;
        break;
      case "rate":
        aVal = a.conversionRate;
        bVal = b.conversionRate;
        break;
      case "earnings":
        aVal = a.earningsCents;
        bVal = b.earningsCents;
        break;
    }

    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  if (loading) return <LoadingSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Affiliates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Rank
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Name
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Code
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                  <button
                    onClick={() => handleSort("clicks")}
                    className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    Clicks
                    <ArrowUpDown
                      className={`h-3 w-3 ${sortField === "clicks" ? "opacity-100" : "opacity-40"}`}
                    />
                  </button>
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                  <button
                    onClick={() => handleSort("conversions")}
                    className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    Conv.
                    <ArrowUpDown
                      className={`h-3 w-3 ${sortField === "conversions" ? "opacity-100" : "opacity-40"}`}
                    />
                  </button>
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                  <button
                    onClick={() => handleSort("rate")}
                    className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    Rate
                    <ArrowUpDown
                      className={`h-3 w-3 ${sortField === "rate" ? "opacity-100" : "opacity-40"}`}
                    />
                  </button>
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                  <button
                    onClick={() => handleSort("earnings")}
                    className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    Earnings
                    <ArrowUpDown
                      className={`h-3 w-3 ${sortField === "earnings" ? "opacity-100" : "opacity-40"}`}
                    />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                    No affiliates found
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((affiliate, index) => (
                  <TableRow key={affiliate.id}>
                    <TableCell className="text-primary font-semibold">#{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{affiliate.name}</p>
                        <p className="text-muted-foreground text-xs">{affiliate.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{affiliate.referralCode}</TableCell>
                    <TableCell className="text-right">{affiliate.clicksThisMonth}</TableCell>
                    <TableCell className="text-right">{affiliate.conversions}</TableCell>
                    <TableCell className="text-right">
                      {affiliate.conversionRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${(affiliate.earningsCents / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
