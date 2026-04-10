import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Settings2 as Settings2Icon } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { CopyIdButton } from "@/components/jobs/copy-id-button";
import { RetryPostButton } from "@/components/queue/retry-post-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { jobRuns, tweets } from "@/lib/schema";

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
  const session = await requireAdmin();
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
    statusFilter
      ? eq(jobRuns.status, statusFilter as "running" | "success" | "failed" | "retrying")
      : sql<boolean>`true`,
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

  // Fetch first-tweet content for posts referenced in job runs
  const postIds = [...new Set(runs.map((r) => r.postId).filter(Boolean))] as string[];
  const postPreviews = new Map<string, string>();
  if (postIds.length > 0) {
    const previews = await db
      .select({ postId: tweets.postId, content: tweets.content })
      .from(tweets)
      .where(and(sql`${tweets.postId} IN ${postIds}`, eq(tweets.position, 0)));
    for (const p of previews) {
      if (p.postId) postPreviews.set(p.postId, p.content || "");
    }
  }

  const truncateId = (id: string) => (id.length > 8 ? id.slice(0, 8) : id);

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
          <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" method="GET">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Status</Label>
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Queue</Label>
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
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <Label className="text-muted-foreground text-xs">Search</Label>
              <Input
                name="q"
                defaultValue={q || ""}
                placeholder="Search postId / jobId / correlationId"
                className="h-10 sm:min-w-[280px]"
              />
            </div>

            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md px-4 text-sm font-medium transition-colors sm:w-auto"
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
            <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Settings2Icon className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No jobs found</h3>
            <p className="text-muted-foreground max-w-md">
              Try adjusting your filters or check back later for job history.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((r) => {
            const preview = r.postId ? postPreviews.get(r.postId) : undefined;
            return (
              <Card key={r.id} className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={badgeVariant(String(r.status)) as any}>
                        {String(r.status)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {String(r.queueName)}
                      </Badge>
                      {r.postId && (
                        <Link href={`/dashboard/jobs?q=${encodeURIComponent(String(r.postId))}`}>
                          <Badge
                            variant="secondary"
                            className="hover:bg-secondary/80 cursor-pointer font-mono"
                          >
                            {truncateId(r.postId)}
                          </Badge>
                        </Link>
                      )}
                    </div>
                    <div
                      className="text-muted-foreground text-xs"
                      title={new Date(r.startedAt).toLocaleString()}
                    >
                      {formatDistanceToNow(new Date(r.startedAt), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Post content preview */}
                  {preview && (
                    <p className="text-muted-foreground border-border line-clamp-2 border-l-2 pl-3 text-sm italic">
                      {preview}
                    </p>
                  )}

                  <div className="bg-muted/30 grid gap-2 rounded-md p-3 text-sm">
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <span>Job ID:</span>
                      <span className="text-foreground font-mono">
                        {truncateId(String(r.jobId))}
                      </span>
                      <CopyIdButton value={String(r.jobId)} />
                    </div>
                    {r.correlationId && (
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <span>Correlation:</span>
                        <span className="text-foreground font-mono">
                          {truncateId(String(r.correlationId))}
                        </span>
                        <CopyIdButton value={String(r.correlationId)} />
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      {(r.attempts || r.attemptsMade) && (
                        <div className="text-muted-foreground">
                          Attempts:{" "}
                          <span className="text-foreground font-medium">{r.attemptsMade || 0}</span>
                          {" / "}
                          <span className="text-foreground font-medium">{r.attempts || "?"}</span>
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        Duration:{" "}
                        <span className="text-foreground font-medium">
                          {r.finishedAt
                            ? `${Math.max(0, Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000))}s`
                            : "—"}
                        </span>
                      </div>
                    </div>
                    {r.error && (
                      <div className="text-destructive bg-destructive/10 mt-2 rounded px-2 py-1 text-xs break-words">
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
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t pt-4">
            <Link
              className={
                page === 0
                  ? "text-muted-foreground pointer-events-none"
                  : "text-primary text-sm hover:underline"
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
            <div className="text-muted-foreground text-sm">Page {page + 1}</div>
            <Link
              className={
                runs.length < limit
                  ? "text-muted-foreground pointer-events-none"
                  : "text-primary text-sm hover:underline"
              }
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
