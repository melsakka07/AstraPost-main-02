"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function AffiliateLeaderboard() {
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
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("clicks")}
                    className="h-6 gap-1 px-1"
                  >
                    Clicks
                    {sortField === "clicks" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("conversions")}
                    className="h-6 gap-1 px-1"
                  >
                    Conversions
                    {sortField === "conversions" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("rate")}
                    className="h-6 gap-1 px-1"
                  >
                    Rate
                    {sortField === "rate" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("earnings")}
                    className="h-6 gap-1 px-1"
                  >
                    Earnings
                    {sortField === "earnings" && <ArrowUpDown className="h-3 w-3" />}
                  </Button>
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
