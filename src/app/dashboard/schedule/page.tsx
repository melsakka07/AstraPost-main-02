import Link from "next/link";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { eq, and, asc, gte, lte, sql, inArray, isNotNull } from "drizzle-orm";
import { CalendarDays, PlusCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BulkImportDialog } from "@/components/calendar/bulk-import-dialog";
import { CalendarViewClient } from "@/components/calendar/calendar-view-client";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { QueueContent } from "@/components/queue/queue-content";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { posts, user, xAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const SCHEDULED_PAGE_SIZE = 20;
const VALID_CALENDAR_VIEWS = ["month", "week", "day"] as const;
type CalendarView = (typeof VALID_CALENDAR_VIEWS)[number];

function isValidCalendarView(v: unknown): v is CalendarView {
  return typeof v === "string" && (VALID_CALENDAR_VIEWS as readonly string[]).includes(v);
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; date?: string }>;
}) {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login?callbackUrl=/dashboard/schedule");

  const params = await searchParams;
  const viewParam = params.view;

  // Canonicalize invalid ?view= values to list mode
  if (viewParam && !isValidCalendarView(viewParam) && viewParam !== "list") {
    const canonical = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== "view" && typeof value === "string") {
        canonical.set(key, value);
      }
    }
    canonical.set("view", "list");
    redirect(`/dashboard/schedule?${canonical.toString()}`);
  }

  // ── Calendar Mode (view=month|week|day) ──────────────────────────
  if (isValidCalendarView(viewParam)) {
    const tCalendar = await getTranslations("calendar");

    // Validate the ?date= param
    const currentDate = (() => {
      const date = params.date;
      if (!date) return new Date();
      const parsed = new Date(date);
      const year = parsed.getFullYear();
      if (isNaN(parsed.getTime()) || year < 2000 || year > 2100) return new Date();
      return parsed;
    })();

    const xAccountsList = await db.query.xAccounts.findMany({
      where: eq(xAccounts.userId, ctx.currentTeamId),
      columns: { id: true, xUsername: true },
    });

    // Calculate range for the calendar view (cover full month grid)
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));

    const [scheduledPosts, draftPosts] = await Promise.all([
      db.query.posts.findMany({
        where: and(
          eq(posts.userId, ctx.currentTeamId),
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
      }),
      db.query.posts.findMany({
        where: and(
          eq(posts.userId, ctx.currentTeamId),
          eq(posts.status, "draft"),
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
      }),
    ]);

    return (
      <DashboardPageWrapper
        icon={CalendarDays}
        title={tCalendar("title")}
        description={tCalendar("description")}
        actions={
          <>
            <BulkImportDialog xAccounts={xAccountsList} />
            <Button variant="outline" asChild>
              <Link href="/dashboard/schedule?view=list">{tCalendar("open_queue")}</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/compose">
                <PlusCircle className="me-2 h-4 w-4" />
                {tCalendar("schedule_new")}
              </Link>
            </Button>
          </>
        }
      >
        <div className="bg-background -mx-1 overflow-hidden rounded-lg border p-4 shadow-sm">
          <CalendarViewClient
            posts={scheduledPosts}
            drafts={draftPosts}
            currentDate={currentDate}
            initialView={viewParam}
          />
        </div>
      </DashboardPageWrapper>
    );
  }

  // ── List Mode (default: no view or view=list) ────────────────────
  const tQueue = await getTranslations("queue");

  const pageParam = params.page;
  const scheduledPage = Math.max(
    0,
    parseInt(Array.isArray(pageParam) ? (pageParam[0] ?? "0") : (pageParam ?? "0"), 10) || 0
  );

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, ctx.currentTeamId),
    columns: { plan: true, trialEndsAt: true, name: true },
  });

  const isTrialActive = dbUser?.trialEndsAt && new Date() < dbUser.trialEndsAt;
  const plan = isTrialActive ? "pro_monthly" : dbUser?.plan;
  const limits = getPlanLimits(plan);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const teamAccounts = await db.query.xAccounts.findMany({
    where: eq(xAccounts.userId, ctx.currentTeamId),
    columns: { id: true },
  });
  const accountIds = teamAccounts.map((a) => a.id);

  let postCount = 0;
  let scheduledPosts: any[] = [];
  let hasMoreScheduled = false;
  let totalScheduled = 0;
  let failedPosts: any[] = [];
  let awaitingApprovalPosts: any[] = [];

  if (accountIds.length > 0) {
    const [postCountRes, scheduledCountRes] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(and(inArray(posts.xAccountId, accountIds), gte(posts.createdAt, monthStart))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(and(inArray(posts.xAccountId, accountIds), eq(posts.status, "scheduled"))),
    ]);
    postCount = Number(postCountRes[0]?.count ?? 0);
    totalScheduled = Number(scheduledCountRes[0]?.count ?? 0);

    // P1 -- paginate scheduled posts; fetch one extra to detect hasMore
    const scheduledRaw = await db.query.posts.findMany({
      where: and(inArray(posts.xAccountId, accountIds), eq(posts.status, "scheduled")),
      orderBy: [asc(posts.scheduledAt)],
      limit: SCHEDULED_PAGE_SIZE + 1,
      offset: scheduledPage * SCHEDULED_PAGE_SIZE,
      with: {
        tweets: { orderBy: (tweets, { asc }) => [asc(tweets.position)] },
        user: { columns: { name: true, image: true } },
        xAccount: { columns: { id: true, xUsername: true, xSubscriptionTier: true } },
      },
    });
    hasMoreScheduled = scheduledRaw.length > SCHEDULED_PAGE_SIZE;
    scheduledPosts = hasMoreScheduled ? scheduledRaw.slice(0, SCHEDULED_PAGE_SIZE) : scheduledRaw;

    failedPosts = await db.query.posts.findMany({
      where: and(
        inArray(posts.xAccountId, accountIds),
        sql`${posts.status}::text IN ('failed', 'paused_needs_reconnect')`
      ),
      orderBy: [asc(posts.updatedAt)],
      with: {
        tweets: { orderBy: (tweets, { asc }) => [asc(tweets.position)] },
        user: { columns: { name: true, image: true } },
        xAccount: { columns: { id: true, xUsername: true, xSubscriptionTier: true } },
      },
    });

    awaitingApprovalPosts = await db.query.posts.findMany({
      where: and(inArray(posts.xAccountId, accountIds), eq(posts.status, "awaiting_approval")),
      orderBy: [asc(posts.createdAt)],
      with: {
        tweets: { orderBy: (tweets, { asc }) => [asc(tweets.position)] },
        user: { columns: { name: true, image: true } },
        xAccount: { columns: { id: true, xUsername: true, xSubscriptionTier: true } },
      },
    });
  }

  const isNearLimit = limits.postsPerMonth !== Infinity && postCount >= limits.postsPerMonth - 2;
  // Serialize Infinity as null for the client component (Infinity can't cross RSC boundary)
  const postsPerMonthLimit = limits.postsPerMonth === Infinity ? null : limits.postsPerMonth;

  return (
    <QueueContent
      title={ctx.isOwner ? tQueue("title") : `${dbUser?.name || "Team"}'s Queue`}
      postCount={postCount}
      postsPerMonthLimit={postsPerMonthLimit}
      isNearLimit={isNearLimit}
      scheduledPosts={scheduledPosts}
      hasMoreScheduled={hasMoreScheduled}
      scheduledPage={scheduledPage}
      totalScheduled={totalScheduled}
      failedPosts={failedPosts}
      awaitingApprovalPosts={awaitingApprovalPosts}
      isOwner={ctx.isOwner}
      role={ctx.role ?? ""}
      currentUserId={ctx.session.user.id}
    />
  );
}
