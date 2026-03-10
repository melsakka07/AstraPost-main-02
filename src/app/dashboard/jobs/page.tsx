import { headers } from "next/headers";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { RetryPostButton } from "@/components/queue/retry-post-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

  const where = and(
    eq(jobRuns.userId, session.user.id),
    status ? eq(jobRuns.status, status) : sql<boolean>`true`,
    queue ? eq(jobRuns.queueName, queue) : sql<boolean>`true`,
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
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" method="GET">
            <select
              name="status"
              defaultValue={status || ""}
              aria-label="Filter jobs by status"
              title="Filter jobs by status"
              className="h-10 rounded-md border bg-background px-3 text-sm sm:min-w-[180px]"
            >
              <option value="">All statuses</option>
              <option value="running">running</option>
              <option value="retrying">retrying</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
            </select>

            <select
              name="queue"
              defaultValue={queue || ""}
              aria-label="Filter jobs by queue"
              title="Filter jobs by queue"
              className="h-10 rounded-md border bg-background px-3 text-sm sm:min-w-[180px]"
            >
              <option value="">All queues</option>
              <option value="schedule-queue">schedule-queue</option>
              <option value="analytics-queue">analytics-queue</option>
            </select>

            <input
              name="q"
              defaultValue={q || ""}
              placeholder="Search postId / jobId / correlationId"
              className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm sm:min-w-[280px]"
            />

            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground sm:w-auto"
            >
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      {runs.length === 0 ? (
        <div className="text-muted-foreground">No jobs found.</div>
      ) : (
        <div className="space-y-3">
          {runs.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-6 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={badgeVariant(String(r.status)) as any}>
                      {String(r.status)}
                    </Badge>
                    <Badge variant="outline">{String(r.queueName)}</Badge>
                    {r.postId && (
                      <Link href={`/dashboard/jobs?q=${encodeURIComponent(String(r.postId))}`}>
                        <Badge variant="secondary">post {r.postId}</Badge>
                      </Link>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.startedAt).toLocaleString()}
                  </div>
                </div>

                <div className="grid gap-1 text-sm">
                  <div className="text-muted-foreground">
                    jobId: <span className="break-all text-foreground">{String(r.jobId)}</span>
                  </div>
                  {r.correlationId && (
                    <div className="text-muted-foreground">
                      correlationId:{" "}
                      <span className="break-all text-foreground">{String(r.correlationId)}</span>
                    </div>
                  )}
                  {(r.attempts || r.attemptsMade) && (
                    <div className="text-muted-foreground">
                      attempts: <span className="text-foreground">{r.attemptsMade || 0}</span>
                      {" / "}
                      <span className="text-foreground">{r.attempts || "?"}</span>
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    duration:{" "}
                    <span className="text-foreground">
                      {r.finishedAt
                        ? `${Math.max(0, Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000))}s`
                        : "—"}
                    </span>
                  </div>
                  {r.error && (
                    <div className="break-words text-destructive">{String(r.error)}</div>
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

          <div className="flex items-center justify-between pt-2">
            <Link
              className={
                page === 0
                  ? "pointer-events-none text-muted-foreground"
                  : "text-sm text-primary"
              }
              href={`/dashboard/jobs?${new URLSearchParams({
                ...(status ? { status } : {}),
                ...(queue ? { queue } : {}),
                ...(q ? { q } : {}),
                page: String(Math.max(0, page - 1)),
              }).toString()}`}
            >
              Previous
            </Link>
            <div className="text-sm text-muted-foreground">Page {page + 1}</div>
            <Link
              className={runs.length < limit ? "pointer-events-none text-muted-foreground" : "text-sm text-primary"}
              href={`/dashboard/jobs?${new URLSearchParams({
                ...(status ? { status } : {}),
                ...(queue ? { queue } : {}),
                ...(q ? { q } : {}),
                page: String(page + 1),
              }).toString()}`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
