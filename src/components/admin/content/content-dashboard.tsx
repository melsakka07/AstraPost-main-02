"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, CheckCircle2, Clock, FileText, TrendingUp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

interface ContentData {
  summary: {
    total: number;
    published: number;
    scheduled: number;
    failed: number;
    thisWeek: number;
    aiGenerated: number;
  };
  topPosts: {
    data: Array<{
      content: string;
      userName: string;
      userEmail: string;
      impressions: number;
      likes: number;
      retweets: number;
      engagementRate: string;
      performanceScore: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  volume: Array<{ date: string; published: number; failed: number }>;
  failureReasons: Array<{ reason: string; count: number }>;
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getVariant(value: number, threshold: number): "default" | "success" | "destructive" {
  if (threshold === 0) return value === 0 ? "default" : "destructive";
  return value > 0 ? "success" : "default";
}

export function ContentDashboard() {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pathname = usePathname();

  const fetchData = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/content?page=${pageNum}`);
      const json = await res.json();
      setData(json.data ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page, pathname]);

  if (loading && !data) return <LoadingSkeleton />;
  if (!data) return null;

  const { summary, topPosts, failureReasons } = data;
  const hasFailures = failureReasons.length !== 0;
  const thisWeekVariant = getVariant(summary.thisWeek, 1);
  const failedVariant = getVariant(summary.failed, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Content Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total Posts" value={summary.total.toLocaleString()} icon={FileText} />
          <StatCard
            label="Published"
            value={summary.published.toLocaleString()}
            sub="All time"
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            label="Scheduled"
            value={summary.scheduled.toLocaleString()}
            sub="In queue"
            icon={Clock}
          />
          <StatCard
            label="Failed"
            value={summary.failed}
            sub={summary.failed === 0 ? "All clear" : "Needs attention"}
            icon={XCircle}
            variant={failedVariant}
          />
          <StatCard
            label="This Week"
            value={summary.thisWeek}
            sub="Created in last 7 days"
            icon={TrendingUp}
            variant={thisWeekVariant}
          />
          <StatCard
            label="AI Generated"
            value={summary.aiGenerated.toLocaleString()}
            sub={`${Math.round((summary.aiGenerated / summary.total) * 100)}% of total`}
            icon={Bot}
          />
        </div>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {topPosts.data.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No posts with analytics yet.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">RTs</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPosts.data.map((post, i) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-xs truncate" title={post.content}>
                          {post.content}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{post.userName}</span>
                            <span className="text-muted-foreground text-xs">{post.userEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {post.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {post.likes.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {post.retweets.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {post.engagementRate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {topPosts.pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Showing {(topPosts.pagination.page - 1) * topPosts.pagination.limit + 1} to{" "}
                    {Math.min(
                      topPosts.pagination.page * topPosts.pagination.limit,
                      topPosts.pagination.total
                    )}{" "}
                    of {topPosts.pagination.total} posts
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!topPosts.pagination.hasPrev}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!topPosts.pagination.hasNext}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Failure Reasons */}
      {hasFailures && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Failure Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {failureReasons.map((item) => (
                <Badge key={item.reason} variant="destructive" className="text-sm">
                  {item.reason}: {item.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
