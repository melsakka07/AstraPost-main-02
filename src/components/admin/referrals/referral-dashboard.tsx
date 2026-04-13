"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Gift, Users, CreditCard, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReferralSummary {
  totalReferrers: number;
  totalReferred: number;
  totalCreditsIssued: number;
  conversionRate: number;
}

interface ReferrerRow {
  id: string;
  name: string;
  email: string;
  referralCode: string | null;
  referredCount: number;
  convertedCount: number;
  totalCredits: number;
}

interface ReferralsResponse {
  data: {
    summary: ReferralSummary;
    topReferrers: {
      data: ReferrerRow[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "destructive";
}) {
  const iconColor =
    variant === "success"
      ? "text-green-500"
      : variant === "destructive"
        ? "text-destructive"
        : "text-primary";
  const iconBg =
    variant === "success"
      ? "bg-green-500/10"
      : variant === "destructive"
        ? "bg-destructive/10"
        : "bg-primary/10";

  return (
    <Card>
      <CardContent className="pt-5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
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
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function ReferralDashboard() {
  const [data, setData] = useState<ReferralsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pathname = usePathname();

  const fetchData = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "10",
      });
      const res = await fetch(`/api/admin/referrals?${params}`);
      if (!res.ok) throw new Error("Failed to fetch referral data");
      const json: ReferralsResponse = await res.json();
      setData(json.data);
    } catch {
      // Error handled by empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(page);
  }, [fetchData, page, pathname]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading && !data) return <LoadingSkeleton />;
  if (!data) return null;

  const { summary, topReferrers } = data;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Referrers"
            value={summary.totalReferrers.toLocaleString()}
            sub="Users with referral codes"
            icon={Users}
          />
          <StatCard
            label="Total Referred Users"
            value={summary.totalReferred.toLocaleString()}
            sub="Users joined via referral"
            icon={Gift}
            variant={summary.totalReferred > 0 ? "success" : "default"}
          />
          <StatCard
            label="Credits Issued"
            value={summary.totalCreditsIssued.toLocaleString()}
            sub="Total credits awarded"
            icon={CreditCard}
          />
          <StatCard
            label="Conversion Rate"
            value={`${summary.conversionRate}%`}
            sub="Referred users who upgraded"
            icon={TrendingUp}
            variant={summary.conversionRate > 20 ? "success" : "default"}
          />
        </div>
      </div>

      {/* Top Referrers Table */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Top Referrers
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead className="text-right">Referred</TableHead>
                  <TableHead className="text-right">Converted</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : topReferrers.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                      No referrers found
                    </TableCell>
                  </TableRow>
                ) : (
                  topReferrers.data.map((referrer) => (
                    <TableRow key={referrer.id}>
                      <TableCell className="font-medium">{referrer.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {referrer.email}
                      </TableCell>
                      <TableCell>
                        {referrer.referralCode ? (
                          <Badge variant="outline" className="font-mono">
                            {referrer.referralCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {referrer.referredCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {referrer.convertedCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-green-500/30 bg-green-500/10 text-green-600"
                          >
                            {referrer.convertedCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {referrer.totalCredits > 0 ? (
                          <span className="font-medium text-green-600">
                            +{referrer.totalCredits}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {topReferrers.pagination.totalPages > 1 && (
          <div className="text-muted-foreground mt-4 flex items-center justify-between text-sm">
            <span>
              {(page - 1) * topReferrers.pagination.limit + 1}–
              {Math.min(page * topReferrers.pagination.limit, topReferrers.pagination.total)} of{" "}
              {topReferrers.pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2">
                {page} / {topReferrers.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= topReferrers.pagination.totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
