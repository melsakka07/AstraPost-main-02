import { headers } from "next/headers";
import Link from "next/link";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { and, asc, eq, gte, lte, isNotNull } from "drizzle-orm";
import { BulkImportDialog } from "@/components/calendar/bulk-import-dialog";
import { CalendarView } from "@/components/calendar/calendar-view";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, xAccounts } from "@/lib/schema";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { date } = await searchParams;
  const currentDate = date ? new Date(date) : new Date();

  const xAccountsList = await db.query.xAccounts.findMany({
    where: eq(xAccounts.userId, session.user.id),
    columns: { id: true, xUsername: true },
  });

  // Calculate range for the calendar view (cover full month grid)
  const start = startOfWeek(startOfMonth(currentDate));
  const end = endOfWeek(endOfMonth(currentDate));

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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <PageToolbar
        title="Content Calendar"
        description="Review scheduled content and drag to reschedule."
        actions={
          <>
            <BulkImportDialog xAccounts={xAccountsList} />
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/queue">Open Queue</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/compose">Schedule New Post</Link>
            </Button>
          </>
        }
      />

      <div className="h-[calc(100vh-220px)] min-h-[600px] rounded-lg border bg-background p-4 shadow-sm">
        <CalendarView posts={scheduledPosts} currentDate={currentDate} />
      </div>
    </div>
  );
}
