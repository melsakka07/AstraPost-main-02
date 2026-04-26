"use client";

import { useState } from "react";
import { Bot, CheckCircle2, Clock, FileText, TrendingUp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ContentDashboardProps {
  initialData?: ContentData | null;
}

export function ContentDashboard({ initialData }: ContentDashboardProps = {}) {
  const [page, setPage] = useState(1);

  const { data, loading } = useAdminPolling<ContentData>({
    fetchFn: async (signal) => {
      const res = await fetch(`/api/admin/content?page=${page}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch content data");
      const json = await res.json();
      return json.data;
    },
    intervalMs: 60_000,
    ...(initialData !== undefined && { initialData }),
  });

  if (loading && !data) return <LoadingSkeleton />;
  if (!data) return null;

  const { summary, topPosts, failureReasons } = data;
  const hasFailures = failureReasons.length !== 0;
  const aiShare = summary.total > 0 ? Math.round((summary.aiGenerated / summary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Content Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total Posts" value={summary.total.toLocaleString()} icon={FileText} />
          <StatCard
            title="Published"
            value={summary.published.toLocaleString()}
            description="All time"
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Scheduled"
            value={summary.scheduled.toLocaleString()}
            description="In queue"
            icon={Clock}
          />
          <StatCard
            title="Failed"
            value={summary.failed}
            description={summary.failed === 0 ? "All clear" : "Needs attention"}
            icon={XCircle}
            variant={summary.failed === 0 ? "default" : "destructive"}
          />
          <StatCard
            title="This Week"
            value={summary.thisWeek}
            description="Created in last 7 days"
            icon={TrendingUp}
            variant={summary.thisWeek > 0 ? "success" : "default"}
          />
          <StatCard
            title="AI Generated"
            value={summary.aiGenerated.toLocaleString()}
            description={`${aiShare}% of total`}
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
                      <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Content
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Author
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                        Impressions
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                        Likes
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                        RTs
                      </TableHead>
                      <TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
                        Engagement
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((__, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : topPosts.data.map((post, i) => (
                          <TableRow key={i}>
                            <TableCell
                              className="max-w-xs truncate"
                              title={post.content}
                              dir="auto"
                            >
                              {post.content}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium" dir="auto">
                                  {post.userName}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {post.userEmail}
                                </span>
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
