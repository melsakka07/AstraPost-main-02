import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { eq, and, gte, lt } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/brand";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardHeaderSkeleton } from "@/components/dashboard/dashboard-header-skeleton";
import type { Notification } from "@/components/dashboard/notification-center";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarSkeleton } from "@/components/dashboard/sidebar-skeleton";
import { XReconnectListener } from "@/components/dashboard/x-reconnect-listener";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { ReferralCookieProcessor } from "@/components/referral/referral-cookie-processor";
import { ImpersonationBanner } from "@/components/ui/impersonation-banner";
import { cachedQuery } from "@/lib/cache";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getPlanStatus } from "@/lib/middleware/require-plan";
import { user, posts, teamMembers, xAccounts } from "@/lib/schema";
import { getMonthlyAiUsage, getMonthlyImageUsage } from "@/lib/services/ai-quota";
import { getDismissedWithSnapshot } from "@/lib/services/notification-dismissals";
import { getTeamContext } from "@/lib/team-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isOnboardingRoute = pathname.startsWith("/dashboard/onboarding");
  const ctx = await getTeamContext();
  if (!ctx) {
    redirect("/login");
  }
  const session = ctx.session;

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  const referralsEnabled = await isFeatureEnabled("referral_program");
  const aiHistoryEnabled = await isFeatureEnabled("ai_history_page");

  const searchParams = headersList.get("x-search-params") ?? "";
  const isOnboarded = dbUser?.onboardingCompleted ?? false;
  if (!isOnboarded && !isOnboardingRoute) {
    // Allow Stripe checkout success redirects to /dashboard/settings/billing
    // so returning users don't bounce back to onboarding after upgrading (#20).
    // session_id must start with cs_ (Stripe Checkout Session prefix) to prevent
    // trivial bypass with an arbitrary query string.
    const isBillingReturn =
      pathname === "/dashboard/settings/billing" && /(?:^|&)session_id=cs_/.test(searchParams);
    if (!isBillingReturn) {
      redirect("/dashboard/onboarding");
    }
  }
  if (isOnboarded && isOnboardingRoute) {
    redirect("/dashboard");
  }

  if (isOnboardingRoute) {
    return (
      <div className="bg-background flex min-h-dvh flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex h-12 shrink-0 items-center gap-2 border-b px-6 backdrop-blur">
          <LogoMark size={24} className="text-primary" />
          <span className="text-xl font-bold">AstraPost</span>
        </header>
        <ReferralCookieProcessor />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const [
    memberships,
    failedPost,
    inactiveAccount,
    expiredTokenAccount,
    aiUsage,
    imageUsage,
    planStatus,
  ] = await Promise.all([
    cachedQuery(
      `team:memberships:${session.user.id}`,
      () =>
        db.query.teamMembers.findMany({
          where: eq(teamMembers.userId, session.user.id),
          with: {
            team: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        }),
      5 * 60 // 5 minutes
    ),
    db.query.posts.findFirst({
      where: and(
        eq(posts.userId, session.user.id),
        eq(posts.status, "failed"),
        gte(posts.updatedAt, oneDayAgo)
      ),
      columns: { id: true, updatedAt: true },
    }),
    db.query.xAccounts.findFirst({
      where: and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, false)),
      columns: { xUsername: true },
    }),
    db.query.xAccounts.findFirst({
      where: and(
        eq(xAccounts.userId, session.user.id),
        eq(xAccounts.isActive, true),
        lt(xAccounts.tokenExpiresAt, new Date())
      ),
      columns: { xUsername: true, tokenExpiresAt: true },
    }),
    cachedQuery(
      `ai:usage:${session.user.id}:${new Date().getFullYear()}-${new Date().getMonth()}`,
      () => getMonthlyAiUsage(session.user.id).catch(() => null),
      10 * 60 // 10 minutes
    ),
    cachedQuery(
      `ai:image-usage:${session.user.id}:${new Date().getFullYear()}-${new Date().getMonth()}`,
      () => getMonthlyImageUsage(session.user.id).catch(() => null),
      10 * 60 // 10 minutes
    ),
    getPlanStatus(session.user.id).catch(() => null),
  ]);

  const formattedMemberships = memberships.map((m) => ({
    team: {
      id: m.team.id,
      name: m.team.name,
      image: m.team.image,
    },
    role: m.role,
  }));

  // ── Notification center: build server notifications from fetched data ──────

  const dismissedMap = await getDismissedWithSnapshot(session.user.id);
  const td = await getTranslations("dashboard_shell");

  const serverNotifications: Notification[] = [];

  // 1. Failed post in last 24h
  if (failedPost) {
    const dismissal = dismissedMap.get("failed_post");
    const snapshot = dismissal?.snapshotData as { latestFailureAt?: string } | undefined;
    const latestFailureAt = failedPost.updatedAt?.toISOString();
    // Show if never dismissed, or if a NEW failure occurred after dismissal
    const isNew =
      !dismissal ||
      (!!snapshot?.latestFailureAt &&
        !!latestFailureAt &&
        latestFailureAt > snapshot.latestFailureAt);
    if (isNew) {
      serverNotifications.push({
        key: "failed_post",
        severity: "error",
        title: td("notifications.failed_post.title"),
        description: td("notifications.failed_post.description"),
        action: {
          label: td("notifications.failed_post.action"),
          href: "/dashboard/schedule?view=list",
        },
        dismissible: true,
        ...(latestFailureAt ? { dismissSnapshot: { latestFailureAt } } : {}),
      });
    }
  }

  // 2. Inactive X account
  if (inactiveAccount) {
    const key = `inactive_x_account:${inactiveAccount.xUsername ?? "unknown"}`;
    if (!dismissedMap.has(key)) {
      serverNotifications.push({
        key,
        severity: "warning",
        title: td("notifications.inactive_x_account.title"),
        description: td("notifications.inactive_x_account.description", {
          username: inactiveAccount.xUsername ? `@${inactiveAccount.xUsername}` : "",
        }),
        action: {
          label: td("notifications.inactive_x_account.action"),
          href: "/dashboard/settings",
        },
        dismissible: true,
      });
    }
  }

  // 2.5 Token expired but account still marked active
  if (expiredTokenAccount) {
    const key = `token_expired:${expiredTokenAccount.xUsername ?? "unknown"}`;
    if (!dismissedMap.has(key)) {
      serverNotifications.push({
        key,
        severity: "warning",
        title: td("notifications.token_expired.title"),
        description: td("notifications.token_expired.description", {
          username: expiredTokenAccount.xUsername ? `@${expiredTokenAccount.xUsername}` : "",
        }),
        action: {
          label: td("notifications.token_expired.action"),
          href: "/dashboard/settings/integrations",
        },
        dismissible: true,
      });
    }
  }

  // 3. Trial expiring within 7 days
  if (dbUser?.trialEndsAt && dbUser.plan === "free") {
    const daysLeft = differenceInCalendarDays(new Date(dbUser.trialEndsAt), new Date());
    if (daysLeft >= 0 && daysLeft <= 7) {
      const dateKey = new Date(dbUser.trialEndsAt).toISOString().slice(0, 10);
      const key = `trial_expiring:${dateKey}`;
      if (!dismissedMap.has(key)) {
        serverNotifications.push({
          key,
          severity: daysLeft <= 3 ? "warning" : "info",
          title:
            daysLeft === 0
              ? td("notifications.trial_expiring.title_ending_today")
              : td("notifications.trial_expiring.title"),
          description:
            daysLeft === 0
              ? td("notifications.trial_expiring.description_ending_today")
              : td("notifications.trial_expiring.description", { days: daysLeft }),
          action: { label: td("notifications.trial_expiring.action"), href: "/pricing" },
          dismissible: true,
        });
      }
    }
  }

  const t = await getTranslations("dashboard");

  return (
    <div data-dashboard-layout className="bg-background pb-safe flex min-h-dvh">
      <a
        href="#main-content"
        className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none"
      >
        {t("skip_to_content")}
      </a>
      <Suspense fallback={null}>
        <DashboardTour />
      </Suspense>
      <ReferralCookieProcessor />
      <XReconnectListener />
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar
          aiUsage={aiUsage}
          imageUsage={imageUsage}
          user={{ name: session.user.name, image: session.user.image || null }}
          referralsEnabled={referralsEnabled}
          aiHistoryEnabled={aiHistoryEnabled}
          isAdmin={!!(session.user as { isAdmin?: boolean }).isAdmin}
          userPlan={dbUser?.plan ?? "free"}
          {...(planStatus !== null && { planStatus })}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        {session.session.impersonatedBy && (
          <section aria-label={t("banners.impersonation")}>
            <ImpersonationBanner
              sessionId={session.session.id}
              impersonatedBy={session.session.impersonatedBy as string}
              targetUserEmail={session.user.email}
              expiresAt={session.session.expiresAt}
            />
          </section>
        )}
        <Suspense fallback={<DashboardHeaderSkeleton />}>
          <DashboardHeader
            user={{
              id: session.user.id,
              name: session.user.name,
              image: session.user.image || null,
            }}
            currentTeamId={ctx?.currentTeamId || session.user.id}
            memberships={formattedMemberships}
            serverNotifications={serverNotifications}
          />
        </Suspense>
        <main id="main-content" tabIndex={-1} className="p-page flex-1 outline-none">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
