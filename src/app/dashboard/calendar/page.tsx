import { headers } from "next/headers";
import Link from "next/link";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { and, asc, eq, gte, lte, isNotNull } from "drizzle-orm";
import { CalendarDays, PlusCircle } from "lucide-react";
import { BulkImportDialog } from "@/components/calendar/bulk-import-dialog";
import { CalendarView } from "@/components/calendar/calendar-view";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
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
    <DashboardPageWrapper
      icon={CalendarDays}
      title="Content Calendar"
      description="Review scheduled content and drag to reschedule."
      actions={
        <>
          <BulkImportDialog xAccounts={xAccountsList} />
          <Button variant="outline" asChild>
            <Link href="/dashboard/queue">Open Queue</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/compose">
              <PlusCircle className="mr-2 h-4 w-4" />
              Schedule New Post
            </Link>
          </Button>
        </>
      }
    >
      <div className="rounded-lg border bg-background p-4 shadow-sm overflow-hidden -mx-1">
        <CalendarView posts={scheduledPosts} currentDate={currentDate} />
      </div>
    </DashboardPageWrapper>
  );
}
