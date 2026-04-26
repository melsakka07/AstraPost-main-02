"use client";

import { useState } from "react";
import { Gift, Users, CreditCard, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminPolling } from "../use-admin-polling";

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

interface ReferralsData {
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

interface ReferralDashboardProps {
  initialData?: ReferralsData | null;
}

export function ReferralDashboard({ initialData }: ReferralDashboardProps = {}) {
  const [page, setPage] = useState(1);

  const { data, loading } = useAdminPolling<ReferralsData>({
    fetchFn: async (signal) => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      const res = await fetch(`/api/admin/referrals?${params}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch referral data");
      const json = await res.json();
      return json.data;
    },
    intervalMs: 60_000,
    ...(initialData !== undefined && { initialData }),
  });

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
            title="Total Referrers"
            value={summary.totalReferrers.toLocaleString()}
            description="Users with referral codes"
            icon={Users}
          />
          <StatCard
            title="Total Referred Users"
            value={summary.totalReferred.toLocaleString()}
            description="Users joined via referral"
            icon={Gift}
            variant={summary.totalReferred > 0 ? "success" : "default"}
          />
          <StatCard
            title="Credits Issued"
            value={summary.totalCreditsIssued.toLocaleString()}
            description="Total credits awarded"
            icon={CreditCard}
          />
          <StatCard
            title="Conversion Rate"
            value={`${summary.conversionRate}%`}
            description="Referred users who upgraded"
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
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Name
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Email
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Referral Code
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                    Referred
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                    Converted
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                    Credits
                  </TableHead>
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
                <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" />
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
                <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
