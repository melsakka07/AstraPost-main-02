import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, gte } from "drizzle-orm";
import { Rocket } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { ChangelogBanner } from "@/components/changelog-banner";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardHeaderSkeleton } from "@/components/dashboard/dashboard-header-skeleton";
import { FailureBanner } from "@/components/dashboard/failure-banner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarSkeleton } from "@/components/dashboard/sidebar-skeleton";
import { TokenWarningBanner } from "@/components/dashboard/token-warning-banner";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { ReferralCookieProcessor } from "@/components/referral/referral-cookie-processor";
import { ImpersonationBanner } from "@/components/ui/impersonation-banner";
import { TrialBanner } from "@/components/ui/trial-banner";
import { cachedQuery } from "@/lib/cache";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { user, posts, teamMembers, xAccounts } from "@/lib/schema";
import { getMonthlyAiUsage, getMonthlyImageUsage } from "@/lib/services/ai-quota";
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
  const t = await getTranslations();

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  const referralsEnabled = await isFeatureEnabled("referral_program");

  const isOnboarded = dbUser?.onboardingCompleted ?? false;
  if (!isOnboarded && !isOnboardingRoute) {
    redirect("/dashboard/onboarding");
  }
  if (isOnboarded && isOnboardingRoute) {
    redirect("/dashboard");
  }

  if (isOnboardingRoute) {
    return (
      <div className="bg-background flex min-h-dvh flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex h-14 shrink-0 items-center gap-2 border-b px-6 backdrop-blur">
          <Rocket className="text-primary h-5 w-5" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight">
            {t("common.app_name", { defaultValue: "AstraPost" })}
          </span>
        </header>
        <ReferralCookieProcessor />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const [memberships, failedPost, inactiveAccount, aiUsage, imageUsage] = await Promise.all([
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
      columns: { id: true },
    }),
    db.query.xAccounts.findFirst({
      where: and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, false)),
      columns: { xUsername: true },
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
  ]);

  const formattedMemberships = memberships.map((m) => ({
    team: {
      id: m.team.id,
      name: m.team.name,
      image: m.team.image,
    },
    role: m.role,
  }));

  return (
    <div data-dashboard-layout className="bg-background pb-safe flex min-h-dvh">
      <DashboardTour />
      <ReferralCookieProcessor />
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar
          aiUsage={aiUsage}
          imageUsage={imageUsage}
          user={{ name: session.user.name, image: session.user.image || null }}
          referralsEnabled={referralsEnabled}
          isAdmin={!!(session.user as { isAdmin?: boolean }).isAdmin}
          userPlan={dbUser?.plan ?? "free"}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        {session.session.impersonatedBy && (
          <ImpersonationBanner
            sessionId={session.session.id}
            impersonatedBy={session.session.impersonatedBy as string}
            targetUserEmail={session.user.email}
            impersonationStartedAt={(session.session as any).impersonationStartedAt}
          />
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
          />
        </Suspense>
        <ChangelogBanner />
        <AnnouncementBanner />
        {inactiveAccount && <TokenWarningBanner username={inactiveAccount.xUsername} />}
        <FailureBanner hasFailures={!!failedPost} />
        <TrialBanner trialEndsAt={dbUser?.trialEndsAt ?? null} plan={dbUser?.plan ?? "free"} />
        <main id="main-content" tabIndex={-1} className="p-page flex-1 outline-none">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
