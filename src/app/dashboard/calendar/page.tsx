import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { and, asc, eq, gte, lte, isNotNull } from "drizzle-orm";
import { CalendarDays, PlusCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BulkImportDialog } from "@/components/calendar/bulk-import-dialog";
import { CalendarViewClient } from "@/components/calendar/calendar-view-client";
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
  if (!session) redirect("/login?callbackUrl=/dashboard/calendar");

  const { date, view } = await searchParams;

  // Validate the ?date= param — reject invalid dates, NaN, and unreasonable years
  // to prevent empty calendars or date-range queries against epoch/invalid timestamps.
  const currentDate = (() => {
    if (!date) return new Date();
    const parsed = new Date(date);
    const year = parsed.getFullYear();
    if (isNaN(parsed.getTime()) || year < 2000 || year > 2100) return new Date();
    return parsed;
  })();

  // Validate the ?view= param — only accept the three known view types.
  const initialView: "month" | "week" | "day" = view === "week" || view === "day" ? view : "month";

  const t = await getTranslations("calendar");

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
      title={t("title")}
      description={t("description")}
      actions={
        <>
          <BulkImportDialog xAccounts={xAccountsList} />
          <Button variant="outline" asChild>
            <Link href="/dashboard/queue">{t("open_queue")}</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/compose">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("schedule_new")}
            </Link>
          </Button>
        </>
      }
    >
      <div className="bg-background -mx-1 overflow-hidden rounded-lg border p-4 shadow-sm">
        <CalendarViewClient
          posts={scheduledPosts}
          currentDate={currentDate}
          initialView={initialView}
        />
      </div>
    </DashboardPageWrapper>
  );
}
