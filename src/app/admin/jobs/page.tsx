import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/admin";
import { analyticsQueue, scheduleQueue } from "@/lib/queue/client";

async function getQueueData(queueName: string, queue: any) {
  const counts = await queue.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed');
  // Get active/failed/delayed jobs
  const jobs = await queue.getJobs(['active', 'waiting', 'delayed', 'failed'], 0, 19, true);
  
  // We need to fetch state for each job as it's not directly in the object sometimes depending on version
  const jobsWithState = await Promise.all(jobs.map(async (job: any) => {
    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      timestamp: job.timestamp,
      failedReason: job.failedReason,
      state,
      data: job.data
    };
  }));
  
  return { name: queueName, counts, jobs: jobsWithState };
}

function QueueStats({ counts }: { counts: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-5 mb-6">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold">{counts.active}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Waiting</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold">{counts.waiting}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Delayed</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold">{counts.delayed}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Failed</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold text-destructive">{counts.failed}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold text-muted-foreground">{counts.completed}</div></CardContent>
      </Card>
    </div>
  );
}

function JobsList({ jobs }: { jobs: any[] }) {
  if (jobs.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-muted-foreground">
        No active jobs found
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="divide-y">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">#{job.id}</span>
                <Badge variant={
                  job.state === 'failed' ? "destructive" : 
                  job.state === 'active' ? "default" : 
                  "secondary"
                }>
                  {job.state}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {job.name} • {formatDistanceToNow(new Date(job.timestamp), { addSuffix: true })}
              </div>
              {job.failedReason && (
                <p className="text-sm text-destructive mt-1 font-mono bg-destructive/10 p-1 rounded">
                  {job.failedReason}
                </p>
              )}
            </div>
            {/* Actions could go here */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminJobsPage() {
  await requireAdmin();

  const scheduleData = await getQueueData("Schedule", scheduleQueue);
  const analyticsData = await getQueueData("Analytics", analyticsQueue);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Queues</h1>
        <p className="text-muted-foreground">Monitor background processing status</p>
      </div>
      
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Schedule Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Queue</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="space-y-4">
          <QueueStats counts={scheduleData.counts} />
          <h3 className="text-lg font-medium">Recent Jobs</h3>
          <JobsList jobs={scheduleData.jobs} />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <QueueStats counts={analyticsData.counts} />
          <h3 className="text-lg font-medium">Recent Jobs</h3>
          <JobsList jobs={analyticsData.jobs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
