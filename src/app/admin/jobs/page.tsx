import { count, desc } from "drizzle-orm";
import { Activity } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { EmptyState } from "@/components/admin/empty-state";
import { ClearQueueButton } from "@/components/admin/jobs/clear-queue-button";
import { JobsPagination } from "@/components/admin/jobs/jobs-pagination";
import { JobsTabsWrapper } from "@/components/admin/jobs/jobs-tabs-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/admin";
import { formatDistance } from "@/lib/date-utils";
import { db } from "@/lib/db";
import { analyticsQueue, scheduleQueue } from "@/lib/queue/client";
import { failedJobs } from "@/lib/schema";
import type { Queue, Job } from "bullmq";

const PAGE_SIZE = 10;

async function getQueueDataInternal(queueName: string, queue: Queue, page: number) {
  const start = (page - 1) * PAGE_SIZE;
  const end = page * PAGE_SIZE - 1;

  const counts = await queue.getJobCounts("active", "waiting", "delayed", "failed", "completed");
  const totalJobs =
    (counts.active || 0) + (counts.waiting || 0) + (counts.delayed || 0) + (counts.failed || 0);

  const jobs = await queue.getJobs(["active", "waiting", "delayed", "failed"], start, end, true);

  const jobsWithState = await Promise.all(
    jobs.map(async (job: Job) => {
      const state = await job.getState();
      return {
        id: job.id,
        name: job.name,
        timestamp: job.timestamp,
        failedReason: job.failedReason,
        state,
        data: job.data,
      };
    })
  );

  return { name: queueName, counts, jobs: jobsWithState, total: totalJobs };
}

async function getQueueData(queueName: string, queue: Queue, page: number) {
  const timeout = new Promise<{
    name: string;
    counts: Record<string, number>;
    jobs: never[];
    total: number;
    error: string;
  }>((resolve) =>
    setTimeout(
      () => resolve({ name: queueName, counts: {}, jobs: [], total: 0, error: "Timed out" }),
      5000
    )
  );
  return Promise.race([getQueueDataInternal(queueName, queue, page), timeout]);
}

async function getDeadLetterQueueData(page: number) {
  const [dlqResult] = await db.select({ count: count() }).from(failedJobs);
  const total = dlqResult?.count ?? 0;

  const dlqJobs = await db.query.failedJobs.findMany({
    orderBy: [desc(failedJobs.createdAt)],
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const jobs = dlqJobs.map((job) => ({
    id: job.id,
    name: job.jobName,
    timestamp: job.createdAt.getTime(),
    failedReason: job.errorMessage,
    state: "dead_letter" as const,
    data: job.jobData,
    failureCount: job.failureCount,
    lastAttemptAt: job.lastAttemptAt,
  }));

  return { jobs, total };
}

function QueueStats({ counts }: { counts: any }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts.active}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Waiting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts.waiting}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Delayed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts.delayed}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-2xl font-bold">{counts.failed}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-2xl font-bold">{counts.completed}</div>
        </CardContent>
      </Card>
    </div>
  );
}

async function JobsList({
  jobs,
  emptyTitle,
  emptyDescription,
}: {
  jobs: any[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (jobs.length === 0) {
    return <EmptyState variant="default" title={emptyTitle} description={emptyDescription} />;
  }

  // Pre-process dates to avoid async in render
  const jobsWithTime = await Promise.all(
    jobs.map(async (job) => ({
      ...job,
      timeAgo: await formatDistance(new Date(job.timestamp)),
    }))
  );

  return (
    <div className="bg-card rounded-md border">
      <div className="divide-y">
        {jobsWithTime.map((job) => (
          <div key={job.id} className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">#{job.id}</span>
                <Badge
                  variant={
                    job.state === "failed"
                      ? "destructive"
                      : job.state === "active"
                        ? "default"
                        : "secondary"
                  }
                >
                  {job.state}
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm">
                {job.name} • {job.timeAgo}
                {(job as any).failureCount && (
                  <span className="ms-2">({(job as any).failureCount} attempts)</span>
                )}
              </div>
              {job.failedReason && (
                <p className="text-destructive bg-destructive/10 mt-1 rounded p-1 font-mono text-sm">
                  {job.failedReason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  await requireAdmin();
  const t = await getTranslations("admin");
  const params = await searchParams;

  const rawPage = parseInt(params.page || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const tab = params.tab || "schedule";

  const scheduleData = await getQueueData("Schedule", scheduleQueue, page);
  const analyticsData = await getQueueData("Analytics", analyticsQueue, page);
  const dlqData = await getDeadLetterQueueData(page);

  const scheduleTotalPages = Math.max(1, Math.ceil(scheduleData.total / PAGE_SIZE));
  const analyticsTotalPages = Math.max(1, Math.ceil(analyticsData.total / PAGE_SIZE));
  const dlqTotalPages = Math.max(1, Math.ceil(dlqData.total / PAGE_SIZE));

  return (
    <AdminPageWrapper
      icon={Activity}
      title={t("pages.jobs.title")}
      description={t("pages.jobs.description")}
    >
      <JobsTabsWrapper defaultTab={tab}>
        <TabsList>
          <TabsTrigger value="schedule">{t("jobs.schedule_queue")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("jobs.analytics_queue")}</TabsTrigger>
          <TabsTrigger
            value="dlq"
            className={dlqData.total > 0 ? "bg-destructive/10 text-destructive" : ""}
          >
            {t("jobs.dead_letter_queue")} ({dlqData.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <QueueStats counts={scheduleData.counts} />
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-medium">{t("jobs.recent_jobs")}</h3>
            <ClearQueueButton
              queueName="schedule"
              queueLabel={t("jobs.schedule_queue")}
              disabled={scheduleData.total === 0}
            />
          </div>
          <JobsList
            jobs={scheduleData.jobs}
            emptyTitle={t("jobs.no_active_jobs")}
            emptyDescription={t("jobs.all_processed")}
          />
          <JobsPagination
            page={page}
            totalPages={scheduleTotalPages}
            total={scheduleData.total}
            pageSize={PAGE_SIZE}
            preserveTab="schedule"
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <QueueStats counts={analyticsData.counts} />
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-medium">{t("jobs.recent_jobs")}</h3>
            <ClearQueueButton
              queueName="analytics"
              queueLabel={t("jobs.analytics_queue")}
              disabled={analyticsData.total === 0}
            />
          </div>
          <JobsList
            jobs={analyticsData.jobs}
            emptyTitle={t("jobs.no_active_jobs")}
            emptyDescription={t("jobs.all_processed")}
          />
          <JobsPagination
            page={page}
            totalPages={analyticsTotalPages}
            total={analyticsData.total}
            pageSize={PAGE_SIZE}
            preserveTab="analytics"
          />
        </TabsContent>

        <TabsContent value="dlq" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-medium">{t("jobs.permanently_failed")}</h3>
            <ClearQueueButton
              queueName="dlq"
              queueLabel={t("jobs.dead_letter_queue")}
              disabled={dlqData.total === 0}
            />
          </div>
          <JobsList
            jobs={dlqData.jobs}
            emptyTitle={t("jobs.no_active_jobs")}
            emptyDescription={t("jobs.all_processed")}
          />
          <JobsPagination
            page={page}
            totalPages={dlqTotalPages}
            total={dlqData.total}
            pageSize={PAGE_SIZE}
            preserveTab="dlq"
          />
        </TabsContent>
      </JobsTabsWrapper>
    </AdminPageWrapper>
  );
}
