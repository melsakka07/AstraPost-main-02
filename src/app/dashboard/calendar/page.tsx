import { headers } from "next/headers";
import Link from "next/link";
import { and, asc, eq, gte, lte, isNotNull } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { ReschedulePostForm } from "@/components/calendar/reschedule-post-form";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";

export default async function CalendarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const start = new Date();
  const startTimestamp = start.getTime();
  const end = new Date(startTimestamp + 7 * 24 * 60 * 60 * 1000);

  const scheduledPosts = await db.query.posts.findMany({
    where: and(
      eq(posts.userId, session.user.id),
      eq(posts.status, "scheduled"),
      isNotNull(posts.scheduledAt),
      gte(posts.scheduledAt, start),
      lte(posts.scheduledAt, end)
    ),
    orderBy: [asc(posts.scheduledAt)],
    with: {
      tweets: {
        orderBy: (tweets, { asc }) => [asc(tweets.position)],
      },
    },
  });

  const byDay = new Map<string, typeof scheduledPosts>();
  for (const p of scheduledPosts) {
    const key = p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 10) : "unknown";
    const arr = byDay.get(key) || [];
    arr.push(p);
    byDay.set(key, arr);
  }

  const days: Array<{ key: string; label: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startTimestamp + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    days.push({ key, label });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <PageToolbar
        title="Content Calendar"
        description="Review weekly scheduled content and adjust timing quickly."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/queue">Open Queue</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/compose">Schedule New Post</Link>
            </Button>
          </>
        }
      />

      {scheduledPosts.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No scheduled content this week"
          description="Plan posts for the next 7 days to build a consistent publishing rhythm."
          primaryAction={
            <Button asChild>
              <Link href="/dashboard/compose">Create Scheduled Post</Link>
            </Button>
          }
          secondaryAction={
            <Button variant="outline" asChild>
              <Link href="/dashboard/queue">Open Queue</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => {
          const items = byDay.get(d.key) || [];
          return (
            <div key={d.key} className="min-w-0 rounded-lg border bg-card p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-muted-foreground">{d.label}</div>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
                  No scheduled posts
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="space-y-3 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">
                            {p.type === "thread" ? "Thread" : "Tweet"}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {p.scheduledAt
                              ? new Date(p.scheduledAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </div>
                        </div>

                        <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">
                          {p.tweets[0]?.content}
                        </p>

                        {p.scheduledAt && (
                          <ReschedulePostForm
                            postId={p.id}
                            initialDate={new Date(p.scheduledAt).toISOString().slice(0, 16)}
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
