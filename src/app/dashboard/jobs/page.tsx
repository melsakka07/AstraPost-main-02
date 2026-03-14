import { headers } from "next/headers";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Settings2 as Settings2Icon } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { RetryPostButton } from "@/components/queue/retry-post-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { jobRuns } from "@/lib/schema";

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string | string[];
    queue?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const params = resolvedSearchParams || {};
  const status = (Array.isArray(params.status) ? params.status[0] : params.status)?.trim();
  const queue = (Array.isArray(params.queue) ? params.queue[0] : params.queue)?.trim();
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim();
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(0, Number(pageParam || 0) || 0);
  const limit = 50;

  // Use "all" as the default/unselected value instead of empty string
  const statusFilter = status === "all" ? undefined : status;
  const queueFilter = queue === "all" ? undefined : queue;

  const where = and(
    eq(jobRuns.userId, session.user.id),
    statusFilter ? eq(jobRuns.status, statusFilter) : sql<boolean>`true`,
    queueFilter ? eq(jobRuns.queueName, queueFilter) : sql<boolean>`true`,
    q
      ? or(
          ilike(jobRuns.postId, `%${q}%`),
          ilike(jobRuns.jobId, `%${q}%`),
          ilike(jobRuns.correlationId, `%${q}%`)
        )
      : sql<boolean>`true`
  );

  const runs = await db
    .select()
    .from(jobRuns)
    .where(where)
    .orderBy(desc(jobRuns.startedAt))
    .limit(limit)
    .offset(page * limit);

  const badgeVariant = (s: string) => {
    if (s === "success") return "default";
    if (s === "failed") return "destructive";
    if (s === "running" || s === "retrying") return "secondary";
    return "outline";
  };

  return (
    <DashboardPageWrapper
      icon={Settings2Icon}
      title="Job History"
      description="Monitor background job runs and troubleshoot failures."
    >
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap" method="GET">
            <Select name="status" defaultValue={status || "all"}>
              <SelectTrigger className="h-10 sm:min-w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="retrying">Retrying</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select name="queue" defaultValue={queue || "all"}>
              <SelectTrigger className="h-10 sm:min-w-[180px]">
                <SelectValue placeholder="All queues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All queues</SelectItem>
                <SelectItem value="schedule-queue">Schedule Queue</SelectItem>
                <SelectItem value="analytics-queue">Analytics Queue</SelectItem>
              </SelectContent>
            </Select>

            <Input
              name="q"
              defaultValue={q || ""}
              placeholder="Search postId / jobId / correlationId"
              className="h-10 min-w-0 flex-1 sm:min-w-[280px]"
            />

            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Apply Filters
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Job List */}
      {runs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Settings2Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground max-w-md">
              Try adjusting your filters or check back later for job history.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badgeVariant(String(r.status)) as any}>
                      {String(r.status)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{String(r.queueName)}</Badge>
                    {r.postId && (
                      <Link href={`/dashboard/jobs?q=${encodeURIComponent(String(r.postId))}`}>
                        <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer">
                          post {r.postId}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.startedAt).toLocaleString()}
                  </div>
                </div>

                <div className="grid gap-2 text-sm bg-muted/30 rounded-md p-3">
                  <div className="text-muted-foreground text-xs">
                    jobId: <span className="break-all text-foreground font-mono">{String(r.jobId)}</span>
                  </div>
                  {r.correlationId && (
                    <div className="text-muted-foreground text-xs">
                      correlationId:{" "}
                      <span className="break-all text-foreground font-mono">{String(r.correlationId)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs">
                    {(r.attempts || r.attemptsMade) && (
                      <div className="text-muted-foreground">
                        attempts: <span className="text-foreground font-medium">{r.attemptsMade || 0}</span>
                        {" / "}
                        <span className="text-foreground font-medium">{r.attempts || "?"}</span>
                      </div>
                    )}
                    <div className="text-muted-foreground">
                      duration:{" "}
                      <span className="text-foreground font-medium">
                        {r.finishedAt
                          ? `${Math.max(0, Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000))}s`
                          : "—"}
                      </span>
                    </div>
                  </div>
                  {r.error && (
                    <div className="break-words text-destructive text-xs bg-destructive/10 rounded px-2 py-1 mt-2">
                      {String(r.error)}
                    </div>
                  )}
                </div>

                {String(r.status) === "failed" && r.postId && (
                  <div className="pt-2">
                    <RetryPostButton postId={String(r.postId)} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Link
              className={
                page === 0
                  ? "pointer-events-none text-muted-foreground"
                  : "text-sm text-primary hover:underline"
              }
              href={`/dashboard/jobs?${new URLSearchParams({
                ...(status && status !== "all" ? { status } : {}),
                ...(queue && queue !== "all" ? { queue } : {}),
                ...(q ? { q } : {}),
                page: String(Math.max(0, page - 1)),
              }).toString()}`}
            >
              ← Previous
            </Link>
            <div className="text-sm text-muted-foreground">Page {page + 1}</div>
            <Link
              className={runs.length < limit ? "pointer-events-none text-muted-foreground" : "text-sm text-primary hover:underline"}
              href={`/dashboard/jobs?${new URLSearchParams({
                ...(status && status !== "all" ? { status } : {}),
                ...(queue && queue !== "all" ? { queue } : {}),
                ...(q ? { q } : {}),
                page: String(page + 1),
              }).toString()}`}
            >
              Next →
            </Link>
          </div>
        </div>
      )}
    </DashboardPageWrapper>
  );
}
